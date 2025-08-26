"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/styles";

type Item = {
  label: string;
  href: string;
  disabled?: boolean;
};

export default function InPageSidebar({
  basePath,
  items,
}: {
  basePath: string;
  items: Item[];
}) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col justify-between min-w-[250px] mr-[8px] h-full">
      <div className="flex flex-col gap-[4px] px-2">
        {items.map((item, index) => {
          const { label, href, disabled = false } = item;
          const fullHref = `${basePath}${href}`;
          const isActive =
            href === "/"
              ? pathname === basePath || pathname === `${basePath}/`
              : pathname === fullHref;
          return (
            <SidebarLink
              key={index}
              href={fullHref}
              label={label}
              isActive={isActive}
              isDisabled={disabled}
            />
          );
        })}
      </div>
    </div>
  );
}

function SidebarLink({
  href,
  label,
  isActive,
  isDisabled,
}: {
  href: string;
  label: string;
  isActive: boolean;
  isDisabled: boolean;
}) {
  return (
    <>
      <Link
        href={href}
        onClick={e => {
          if (isDisabled) {
            e.preventDefault();
            return;
          }
        }}
        className={cn(
          "p-2 py-3 rounded-md text-sm text-gray-500 hover:text-foreground transition-colors",
          isActive &&
            "bg-accent text-foreground font-medium hover:text-foreground",
          isDisabled && "text-gray-600 cursor-not-allowed hover:text-gray-700"
        )}
      >
        <div className="flex items-center gap-2">
          <div className="leading-none">{label}</div>
        </div>
      </Link>
    </>
  );
}
