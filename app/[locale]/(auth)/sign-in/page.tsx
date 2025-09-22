import { AuthForm } from "@/components/auth/auth-form";
import { AuthInput } from "@/components/auth/auth-input";
import { OAuthHandler } from "@/components/auth/oauth-handler";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata() {
  const t = await getTranslations('AuthSignInPage');
  return {
    title: t('metadata_title'),
  };
}

export default async function SignInPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations('AuthSignInPage');
  return (
    <>
      <OAuthHandler locale={locale} />
      <AuthForm
        mode="sign-in"
        title={t('welcome_back')}
        subtitle={t('sign_in_subtitle')}
        buttonText={t('sign_in_button')}
        footerText={t('no_account_question')}
        footerLinkText={t('sign_up_link')}
        footerLinkHref="/sign-up"
        locale={locale}
      >
        <AuthInput
          name="email"
          label={t('email_label')}
          type="email"
          placeholder={t('email_placeholder')}
          required
        />
        <AuthInput
          name="password"
          label={t('password_label')}
          type="password"
          placeholder={t('password_placeholder')}
          required
          forgotPasswordLink
        />
      </AuthForm>
    </>
  );
}