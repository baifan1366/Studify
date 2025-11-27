"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import Image from "next/image";

export function HomeHeader() {
  const locale = useLocale();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
      <nav className="container mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link 
            href={`/${locale}`}
            className="flex items-center gap-3 group"
          >
            <div className="relative w-10 h-10 group-hover:scale-110 transition-transform">
              <Image
                src="../favicon.png"
                alt="Studify Logo"
                fill
                className="object-contain"
                priority
              />
            </div>

          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            <Link 
              href={`/${locale}/about`}
              className="text-foreground/80 hover:text-primary font-medium transition-colors"
            >
              About Us
            </Link>
            <Link 
              href={`/${locale}/courses`}
              className="text-foreground/80 hover:text-primary font-medium transition-colors"
            >
              Courses
            </Link>
            
            <div className="flex items-center gap-3 ml-4">
              <Link 
                href={`/${locale}/sign-in`}
                className="px-6 py-2.5 text-foreground font-semibold hover:text-primary transition-colors"
              >
                Sign In
              </Link>
              <Link 
                href={`/${locale}/student/sign-up`}
                className="px-6 py-2.5 bg-gradient-to-r from-primary to-orange-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-primary/50 transition-all hover:scale-105"
              >
                Get Started
              </Link>
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 hover:bg-accent rounded-lg transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 animate-fade-in">
            <Link 
              href={`/${locale}/about`}
              className="block px-4 py-3 text-foreground/80 hover:text-primary hover:bg-accent rounded-lg font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              About Us
            </Link>
            <Link 
              href={`/${locale}/courses`}
              className="block px-4 py-3 text-foreground/80 hover:text-primary hover:bg-accent rounded-lg font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Courses
            </Link>
            <Link 
              href={`/${locale}/pricing`}
              className="block px-4 py-3 text-foreground/80 hover:text-primary hover:bg-accent rounded-lg font-medium transition-colors"
              onClick={() => setMobileMenuOpen(false)}
            >
              Pricing
            </Link>
            <div className="pt-3 space-y-2">
              <Link 
                href={`/${locale}/sign-in`}
                className="block px-4 py-3 text-center text-foreground font-semibold hover:bg-accent rounded-lg transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Sign In
              </Link>
              <Link 
                href={`/${locale}/student/sign-up`}
                className="block px-4 py-3 text-center bg-gradient-to-r from-primary to-orange-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all"
                onClick={() => setMobileMenuOpen(false)}
              >
                Get Started
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
