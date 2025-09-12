"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ZoomImageProps {
  src: string;
  alt?: string;
  className?: string;
}

export default function ZoomImage({ src, alt, className }: ZoomImageProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* 缩略图 */}
      <img
        src={src}
        alt={alt}
        className={`${className} cursor-zoom-in`}
        onClick={() => setIsOpen(true)}
      />

      {/* Modal 放大图 */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
          >
            <motion.img
              src={src}
              alt={alt}
              className="max-w-[90%] max-h-[90%] object-contain cursor-zoom-out"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
