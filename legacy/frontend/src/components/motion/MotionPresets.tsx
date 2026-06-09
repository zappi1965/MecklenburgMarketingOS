
'use client'
export const fadeInUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.24 }
}

export const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.04
    }
  }
}
