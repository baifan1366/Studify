import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/utils/styles";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-[#FF6B00] text-white hover:bg-[#E55F00] dark:bg-[#FF6B00] dark:text-white dark:hover:bg-[#E55F00]",
        destructive: "bg-red-600 text-white hover:bg-red-700 dark:bg-red-600 dark:text-white dark:hover:bg-red-700",
        outline: "border border-[#064E3B] text-[#064E3B] hover:bg-[#064E3B]/10 dark:border-[#FDF5E6] dark:text-[#FDF5E6] dark:hover:bg-[#FDF5E6]/10",
        secondary: "bg-[#FAF3E0] text-[#222] hover:bg-[#FAF3E0]/80 dark:bg-[#1F2937] dark:text-[#F1F5F9] dark:hover:bg-[#1F2937]/80",
        ghost: "hover:bg-[#FAF3E0] hover:text-[#222] dark:hover:bg-[#1F2937] dark:hover:text-[#F1F5F9]",
        link: "text-[#064E3B] underline-offset-4 hover:underline dark:text-[#FDF5E6]",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };
