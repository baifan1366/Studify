import { AuthForm } from "@/components/auth/auth-form";
import { AuthInput } from "@/components/auth/auth-input";
import { signUpStudent } from "@/app/actions";
import { getTranslations } from 'next-intl/server';

export async function generateMetadata({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('AuthStudentSignUpPage');
  return {
    title: t('metadata_title'),
  };
}

export default async function SignUpPage({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations('AuthStudentSignUpPage');

  return (
    <AuthForm
      action={signUpStudent}
      title={t('student_sign_up_title')}
      subtitle={t('student_sign_up_subtitle')}
      buttonText={t('create_account_button')}
      footerText={t('already_have_account_question')}
      footerLinkText={t('sign_in_link')}
      footerLinkHref="/sign-in"
      locale={locale}
    >
      <AuthInput
        name="fullName"
        label={t('full_name_label')}
        type="text"
        placeholder={t('full_name_placeholder')}
        required
      />
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
      />
      <AuthInput
        name="confirmPassword"
        label={t('confirm_password_label')}
        type="password"
        placeholder={t('confirm_password_placeholder')}
        required
      />
    </AuthForm>
  );
}