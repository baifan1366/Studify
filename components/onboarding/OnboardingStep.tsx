import React from "react";
import { motion } from "framer-motion";
import { Spinner } from "../ui/spinner";
import { ArrowLeft, ArrowRight, CheckCircle } from "lucide-react";

interface OnboardingStepProps {
  title: string;
  description: string;
  children: React.ReactNode;
  action?: (formData: FormData) => void;
  prevAction?: () => void;
  isFirstStep?: boolean;
  isLastStep?: boolean;
  isLoading?: boolean;
  disableNext?: boolean;
}

const OnboardingStep: React.FC<OnboardingStepProps> = ({
  title,
  description,
  children,
  action,
  prevAction,
  isFirstStep,
  isLastStep,
  isLoading,
  disableNext,
}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl"
      >
        <form action={action}>
          {/* Header Section */}
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-4xl font-bold text-white mb-4"
            >
              {title}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-xl text-white/70"
            >
              {description}
            </motion.p>
          </div>

          {/* Content Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="relative bg-gradient-to-br from-white/10 via-white/5 to-white/10 rounded-2xl border border-white/20 backdrop-blur-sm p-8 mb-8"
          >
            <div className="absolute inset-0 overflow-hidden rounded-2xl">
              <motion.div
                className="absolute -top-4 -right-4 w-16 h-16 bg-blue-500/30 rounded-full blur-xl"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
              />
            </div>
            
            <div className="relative z-10">
              {children}
            </div>
          </motion.div>

          {/* Navigation Buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.6 }}
            className="flex justify-between items-center"
          >
            {!isFirstStep ? (
              <motion.button
                type="button"
                onClick={prevAction}
                className="flex items-center gap-2 px-6 py-3 bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg text-white font-medium transition-all backdrop-blur-sm"
                whileHover={{ scale: 1.02, x: -2 }}
                whileTap={{ scale: 0.98 }}
              >
                <ArrowLeft size={18} />
                Previous
              </motion.button>
            ) : (
              <div />
            )}

            {!isLastStep ? (
              <motion.button
                type="submit"
                disabled={isLoading || disableNext}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all ${
                  isLoading || disableNext
                    ? "bg-gray-500/50 cursor-not-allowed text-white/50"
                    : "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg"
                }`}
                whileHover={!(isLoading || disableNext) ? { scale: 1.02, x: 2 } : {}}
                whileTap={!(isLoading || disableNext) ? { scale: 0.98 } : {}}
              >
                {isLoading && <Spinner className="w-4 h-4" />}
                Next
                {!isLoading && <ArrowRight size={18} />}
              </motion.button>
            ) : (
              <motion.button
                type="submit"
                disabled={isLoading || disableNext}
                className={`flex items-center gap-2 px-8 py-3 rounded-lg font-medium transition-all ${
                  isLoading || disableNext
                    ? "bg-gray-500/50 cursor-not-allowed text-white/50"
                    : "bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg"
                }`}
                whileHover={!(isLoading || disableNext) ? { scale: 1.02 } : {}}
                whileTap={!(isLoading || disableNext) ? { scale: 0.98 } : {}}
              >
                {isLoading && <Spinner className="w-4 h-4" />}
                Complete Setup
                {!isLoading && <CheckCircle size={18} />}
              </motion.button>
            )}
          </motion.div>
        </form>
      </motion.div>
    </div>
  );
};

export default OnboardingStep;
