import gradio as gr
import numpy as np
import os
import pandas as pd
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
import pandas as pd
import numpy as np
import torch
import zlib
from scipy.stats import skew, kurtosis, entropy
from tqdm import tqdm
from torch.nn import CrossEntropyLoss
from pathlib import Path
import spaces
import os

theme = gr.Theme.from_hub("gstaff/xkcd") 

# ===========================================================
@spaces.GPU
def detect_ai_text(text):
    global loaded

    import xgboost as xgb
    model_path = Path(__file__).parent / "model.json"
    model = xgb.XGBClassifier()
    model.load_model(model_path)

    if not loaded:
        return "❗ Model not loaded. We require a GPU to run DivEye.", 0.0, pd.DataFrame({
            "Source": ["AI Generated", "Human Written"],
            "Probability (%)": [0, 0]
        })
    
    text = text.strip()
    if not text or len(text.split()) < 15:
        return (
            "❗ Please enter some text with at least 15 words.",
            0.0,
            pd.DataFrame({
                "Source": ["AI Generated", "Human Written"],
                "Probability (%)": [0, 0]
            })
        )

    # Call software
    # ===========================================================
    global div_model, div_tokenizer, bi_model, bi_tokenizer

    # =====================================================================
    # DivEye features
    diveye_features = []
    # 1. Token log likelihoods
    tokens = div_tokenizer.encode(text, return_tensors="pt", truncation=True, max_length=1024).to(div_model.device)
    with torch.no_grad():
        outputs = div_model(tokens, labels=tokens)
    logits = outputs.logits
    shift_logits = logits[:, :-1, :].squeeze(0)
    shift_labels = tokens[:, 1:].squeeze(0)
    log_probs = torch.log_softmax(shift_logits.float(), dim=-1)
    token_log_likelihoods = log_probs[range(shift_labels.shape[0]), shift_labels].cpu().numpy()
    
    # 2. Surprisal
    surprisals = -token_log_likelihoods

    if len(surprisals) < 10 or len(token_log_likelihoods) < 3:
        diveye_features = [0.0] * 11
    
    s = np.array(surprisals)
    mean_s, std_s, var_s, skew_s, kurt_s = np.mean(s), np.std(s), np.var(s), skew(s), kurtosis(s)
    diff_s = np.diff(s)
    mean_diff, std_diff = np.mean(diff_s), np.std(diff_s)
    first_order_diff = np.diff(token_log_likelihoods)
    second_order_diff = np.diff(first_order_diff)
    var_2nd = np.var(second_order_diff)
    entropy_2nd = entropy(np.histogram(second_order_diff, bins=20, density=True)[0])
    autocorr_2nd = np.corrcoef(second_order_diff[:-1], second_order_diff[1:])[0, 1] if len(second_order_diff) > 1 else 0
    comp_ratio = len(zlib.compress(text.encode('utf-8'))) / len(text.encode('utf-8'))

    diveye_features = [mean_s, std_s, var_s, skew_s, kurt_s, mean_diff, std_diff, var_2nd, entropy_2nd, autocorr_2nd, comp_ratio]
    # =====================================================================

    # =====================================================================
    # BiScope features
    COMPLETION_PROMPT_ONLY = "Complete the following text: "
    prompt_ids = bi_tokenizer(COMPLETION_PROMPT_ONLY, return_tensors='pt').input_ids.to(bi_model.device)
    text_ids = bi_tokenizer(text, return_tensors='pt', max_length=2000, truncation=True).input_ids.to(bi_model.device)
    combined_ids = torch.cat([prompt_ids, text_ids], dim=1)
    text_slice = slice(prompt_ids.shape[1], combined_ids.shape[1])

    outputs = bi_model(input_ids=combined_ids)
    logits = outputs.logits
    targets = combined_ids[0][text_slice]

    fce_loss = CrossEntropyLoss(reduction='none')(
            logits[0, text_slice.start-1:text_slice.stop-1, :],
            targets
        ).detach().cpu().numpy()
    bce_loss = CrossEntropyLoss(reduction='none')(
            logits[0, text_slice, :],
            targets
        ).detach().cpu().numpy()
    
    biscope_features = []
    for p in range(1, 10):
        split = len(fce_loss) * p // 10
        fce_clipped = np.nan_to_num(np.clip(fce_loss[split:], -1e6, 1e6), nan=0.0, posinf=1e6, neginf=-1e6)
        bce_clipped = np.nan_to_num(np.clip(bce_loss[split:], -1e6, 1e6), nan=0.0, posinf=1e6, neginf=-1e6)
        biscope_features.extend([
            np.mean(fce_clipped), np.max(fce_clipped), np.min(fce_clipped), np.std(fce_clipped),
            np.mean(bce_clipped), np.max(bce_clipped), np.min(bce_clipped), np.std(bce_clipped)
        ])
    # =====================================================================    

    for f in biscope_features:
        diveye_features.append(f)

    ai_prob = model.predict_proba([diveye_features])[:, 1][0].item()

    # ===========================================================
    human_prob = 1 - ai_prob

    if ai_prob > 0.7:
        message = f"🤖 **Likely AI-generated** (Confidence: {ai_prob:.2%})"
    elif ai_prob > 0.5:
        message = f"⚠️ **Possibly AI-generated** (Confidence: {ai_prob:.2%})"
    else:
        message = f"✅ **Likely Human-written** (Confidence: {human_prob:.2%})"

    bar_data = pd.DataFrame({
        "Source": ["AI Generated", "Human Written"],
        "Probability (%)": [ai_prob * 100, human_prob * 100]
    })

    return message, round(ai_prob, 3), bar_data

# ==========================================================
# Token from environment variable
token = os.getenv("HF_TOKEN") 
loaded = False

if not torch.cuda.is_available():
    loaded = False
    print("[DivEye] CUDA not available. Running on CPU.")

# Import necessary models and tokenizers
if torch.cuda.is_available():
    loaded = True
    model_name_div = "tiiuae/falcon-7b"
    model_name_bi = "google/gemma-1.1-2b-it"

    div_model = AutoModelForCausalLM.from_pretrained(model_name_div, torch_dtype=torch.float16, device_map="cuda:0", use_auth_token=token)
    div_tokenizer = AutoTokenizer.from_pretrained(model_name_div, use_fast=False, trust_remote_code=True, use_auth_token=token)

    bi_model = AutoModelForCausalLM.from_pretrained(model_name_bi, torch_dtype=torch.float16, device_map="cuda:1", use_auth_token=token)
    bi_tokenizer = AutoTokenizer.from_pretrained(model_name_bi, use_fast=False, trust_remote_code=True, use_auth_token=token)

    div_model.eval()
    bi_model.eval()


# Gradio app setup
with gr.Blocks(title="DivEye", theme=gr.themes.Soft()) as demo:
    gr.HTML("""
    <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.5rem; background: #f0f4f8; border-radius: 12px; margin-bottom: 1rem;">
        <div style="text-align: left; max-width: 70%;">
            <h1 style="font-size: 2.2rem; color: #1a1a1a; margin-bottom: 0.5rem;">Diversity Boosts AI-generated Text Detection</h1>
            <h3 style="color: #1a1a1a; margin: 0;">Authors: Advik Raj Basani<sup style="color: red;">1</sup>, Pin-Yu Chen<sup style="color: red;">2</sup></h3>
            <p style="color: #444; font-size: 0.95rem; margin: 0.2rem 0;">
                <sup style="color: red;">1</sup> Birla Institute of Technology and Science, Goa &nbsp;&nbsp; <sup style="color: red;">2</sup> IBM Research, USA
            </p>
        </div>
        <div style="text-align: right;">
            <a href="https://openreview.net/forum?id=QuDDXJ47nq" target="_blank" style="text-decoration: none; margin-right: 0.5rem;">
                <button style="padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; background-color: #3498db; color: white; border: none; cursor: pointer;">
                    📄 Paper
                </button>
            </a>
            <a href="https://github.com/IBM/diveye" target="_blank" style="text-decoration: none;">
                <button style="padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; background-color: #2ecc71; color: white; border: none; cursor: pointer;">
                    🐙 GitHub
                </button>
            </a>
            <a href="https://diveye.vercel.app/" target="_blank" style="text-decoration: none;">
                <button style="padding: 0.6rem 1rem; font-size: 1rem; border-radius: 8px; background-color: #2ecc71; color: white; border: none; cursor: pointer;">
                    🌐 Website
                </button>
            </a>
        </div>
    </div>
    """)

    gr.HTML("""
    <div style="margin-bottom: 1.5rem; background: #eef6ff; padding: 1rem 1.5rem; border-radius: 8px;">
        <p style="color: #333; font-size: 1.05rem; margin: 0;">
            <strong style="color: black;">Abstract:</strong> Detecting AI-generated text is an increasing necessity to combat misuse of LLMs in domains such as education, business compliance, journalism, and social media, where synthetic fluency can mask misinformation or deception. Existing detectors often rely on likelihood-based heuristics or black-box classifiers, which struggle against high-quality generations and lack interpretability. In this work, we propose DivEye, a novel detection framework that captures how unpredictability fluctuates across a text using surprisal-based features. Motivated by the observation that human-authored text exhibits richer variability in lexical and structural unpredictability than LLM outputs, DivEye captures this signal through a set of interpretable statistical features. Our method outperforms existing zero-shot detectors by up to 33.2% and achieves competitive performance with fine-tuned baselines across multiple benchmarks. DivEye is robust to paraphrasing and adversarial attacks, generalizes well across domains and models, and improves the performance of existing detectors by up to 18.7% when used as an auxiliary signal. Beyond detection, DivEye provides interpretable insights into why a text is flagged, pointing to rhythmic unpredictability as a powerful and underexplored signal for LLM detection.
        </p>
    </div>
    """)

    gr.Markdown("## 🔍 DivEye")
    gr.Markdown("Enter text below to analyze the probability of it being AI-generated:")

    with gr.Row():
        with gr.Column(scale=2):
            text_input = gr.Textbox(
                label="Input Text",
                lines=10,
                placeholder="Type or paste text here... (15+ words recommended)",
            )
            analyze_button = gr.Button("🔍 Analyze")

        with gr.Column(scale=1):
            result_output = gr.Markdown("Results will appear here.")
            probability_slider = gr.Slider(
                0, 1, value=0.5, step=0.01,
                label="AI Probability",
                interactive=False
            )
            bar_plot = gr.BarPlot(
                x="Source",
                y="Probability (%)",
                color="Source",
                y_lim=[0, 100],
                height=250,
                title="Confidence Levels"
            )

    gr.Markdown("## 💡 Examples")
    gr.Examples(
        examples=[
            "🤖 Motivated by the recent progress in generative models, we introduce a novel approach for generating images from textual descriptions using attention mechanisms. Our model utilizes a combination of recurrent neural networks and convolutional neural networks to capture intricate details and faithfully render the images described in the captions. Experimental results demonstrate the effectiveness of our proposed method in generating realistic and diverse images, showcasing the potential of leveraging attention for image generation tasks.",
            "🤖 Throughout history, some of the most groundbreaking scientific discoveries have occurred not as the result of meticulous planning, but through serendipity—happy accidents that revealed something entirely unexpected. From penicillin to the microwave oven, serendipitous discoveries have changed the world in ways no experiment could have predicted.",
            "👤 Many modern multiclass and multilabel problems are characterized by\nincreasingly large output spaces. For these problems, label embeddings have\nbeen shown to be a useful primitive that can improve computational and\nstatistical efficiency. In this work we utilize a correspondence between rank\nconstrained estimation and low dimensional label embeddings that uncovers a\nfast label embedding algorithm which works in both the multiclass and\nmultilabel settings. The result is a randomized algorithm for partial least\nsquares, whose running time is exponentially faster than naive algorithms. We\ndemonstrate our techniques on two large-scale public datasets, from the Large\nScale Hierarchical Text Challenge and the Open Directory Project, where we\nobtain state of the art results.",
            "👤 So many times have I walked on ruins, the remainings of places that I loved and got used to.. At first I was scared, each time I could feel my city, my current generation collapse, break into the black hole that thrives within it, I could feel humanity, the way I'm able to feel my body.. After a few hundred years, the pattern became obvious, no longer the war and damage that would devastate me over and over again in the far past was effecting me so dominantly.\nIt's funny, but I felt as if after gaining what I desired so long, what I have lived for my entire life, only then, when I achieved immortality I started truly aging.\n5 world wars have passed, and now they feel like a simple sickeness that would pass by every so often, I could no longer evaluate the individual human as a being of its own, the importance of mortals is merely the same as the importance of my skin cells; They are a part of a mechanism so much more advanced, a mechanism that is so dear to my fallen heart a mechanism that I have seen fall and rise so many times, a mechanism that when lost all of which it had, had me loosing my will to live, for the first time in all of my thousands years of existence.",
            "🤖 In the span of just two decades, social media has transformed the way humans connect, share, and communicate. Platforms like Facebook, Twitter (now X), Instagram, TikTok, and WhatsApp have reshaped social interactions, dissolving geographic boundaries and allowing instant communication across the globe. Yet, while the benefits are substantial, this digital evolution also comes with significant social and psychological trade-offs."
        ],
        inputs=text_input,
        label="Click an example to test it instantly."
    )

    analyze_button.click(
        fn=detect_ai_text,
        inputs=text_input,
        outputs=[result_output, probability_slider, bar_plot]
    )

    text_input.change(
        fn=detect_ai_text,
        inputs=text_input,
        outputs=[result_output, probability_slider, bar_plot],
    )

# Run the app
if __name__ == "__main__":
    demo.queue()
    demo.launch()