"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Mail, MapPin, Phone } from "lucide-react";
import Image from "next/image";

export function HomeFooter() {
  const locale = useLocale();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-card border-t border-border">
      <div className="container mx-auto px-6 py-12 md:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link href={`/${locale}`} className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 group-hover:scale-110 transition-transform">
                <Image
                  src="../favicon.png"
                  alt="Studify Logo"
                  fill
                  className="object-contain"
                />
              </div>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Your AI-powered learning platform. Anytime, anywhere education for everyone.
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Product</h3>
            <ul className="space-y-3">
              <li>
                <Link href={`/${locale}/courses`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Courses
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/classrooms`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Classrooms
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/community`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Community
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/pricing`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Company</h3>
            <ul className="space-y-3">
              <li>
                <Link href={`/${locale}/about`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  About Us
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Contact
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/careers`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Careers
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/blog`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
                  Blog
                </Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-bold text-foreground mb-4">Contact</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Mail className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>edusocial0704@gmail.com</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <Phone className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>+60 1155819008</span>
              </li>
              <li className="flex items-start gap-2 text-muted-foreground text-sm">
                <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>cyberjaya selangor</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-muted-foreground text-sm">
            © {currentYear} Studify. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link href={`/${locale}/privacy`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Privacy Policy
            </Link>
            <Link href={`/${locale}/terms`} className="text-muted-foreground hover:text-primary transition-colors text-sm">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
