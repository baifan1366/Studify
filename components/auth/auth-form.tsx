import Link from "next/link";

interface AuthFormProps {
  action: (formData: FormData) => void;
  title: string;
  subtitle: string;
  children: React.ReactNode;
  buttonText: string;
  footerText: string;
  footerLinkText: string;
  footerLinkHref: string;
  locale: string;
}

export function AuthForm({
  action,
  title,
  subtitle,
  children,
  buttonText,
  footerText,
  footerLinkText,
  footerLinkHref,
  locale,
}: AuthFormProps) {
  return (
    <div className="w-[420px] p-6 m-auto">
      <div className="text-center">
        <div className="mx-auto h-16 w-16 bg-[#7C3AED] rounded-2xl flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold">ST</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">{title}</h2>
        <p className="text-gray-600 text-sm">{subtitle}</p>
      </div>

      <div className="bg-white rounded-3xl shadow-lg p-8 mt-6">
        <form action={action} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />
          {children}
          <button
            type="submit"
            className="w-full bg-black text-white py-2.5 rounded-lg font-medium hover:bg-gray-800 transition-colors"
          >
            {buttonText}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <span className="text-gray-600">{footerText} </span>
          <Link href={footerLinkHref} className="text-[#7C3AED] hover:text-[#6025DD] font-medium">
            {footerLinkText}
          </Link>
        </div>
      </div>
    </div>
  );
}
