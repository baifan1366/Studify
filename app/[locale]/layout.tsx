import { Providers } from "../providers";

export default function LocaleLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Providers>{children}</Providers>;
}
