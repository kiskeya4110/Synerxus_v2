import { motion } from "framer-motion";
import { pageVariants } from "@/lib/animations";

interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Wrapper component for page-level transitions
 * Use this to wrap page content for smooth entry animations
 * Note: Exit animations require AnimatePresence which isn't compatible with all routers
 */
export function PageTransition({ children, className }: PageTransitionProps) {
  return (
    <motion.div
      initial="initial"
      animate="enter"
      variants={pageVariants}
      className={className}
    >
      {children}
    </motion.div>
  );
}
