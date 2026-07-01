import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ImageWithFallback } from './ImageWithFallback'; // Import the new component

const carouselSlides = [
  {
    image: 'https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=1080&h=1400&fit=crop&auto=format',
    tagline: 'Compare prices across SA\'s top retailers',
    description: 'Checkers, Pick n Pay, Woolworths, Shoprite — see who\'s cheapest before you leave home'
  },
  {
    image: 'https://images.unsplash.com/photo-1575898201154-d65111ab78b9?w=1080&h=1400&fit=crop&auto=format',
    tagline: 'Save more every shop',
    description: 'Track weekly specials and price drops so every rand in your basket goes further'
  },
  {
    image: 'https://images.unsplash.com/photo-1561069934-eee225952461?w=1080&h=1400&fit=crop&auto=format',
    tagline: 'Every rand counts',
    description: 'Thousands of South Africans already use chuse to stretch their grocery budget'
  }
];

export function SignUpCarousel() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselSlides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative h-full w-full bg-[#0A0A0A] overflow-hidden">
      {/* Background image */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, scale: 1.06 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.97 }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
          className="absolute inset-0"
        >
          <ImageWithFallback // Re-introduce ImageWithFallback
            src={carouselSlides[currentSlide].image}
            alt={carouselSlides[currentSlide].tagline}
            className="w-full h-full object-cover opacity-35"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/55 to-[#FFE600]/18" />
        </motion.div>
      </AnimatePresence>

      {/* Brand mark top-left */}
      <div className="relative z-10 p-10">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[#FFE600] rounded-sm flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M2 8h8M2 12h10" stroke="black" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
          <img
            src="/icons/playstore.png"
            alt="Chuse"
            className="h-6 w-auto select-none"
          />
        </div>
      </div>

      {/* Bottom tagline content */}
      <div className="relative z-10 h-full flex flex-col justify-end px-10 pb-12">
        {/* Slide dots */}
        <div className="flex gap-1.5 mb-7">
          {carouselSlides.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`h-0.5 rounded-full transition-all duration-500 ${
                index === currentSlide ? 'w-10 bg-[#FFE600]' : 'w-4 bg-white/30'
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, delay: 0.15 }}
          >
            <h2
              className="text-5xl font-bold text-white mb-3 leading-tight uppercase"
              style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
            >
              {carouselSlides[currentSlide].tagline}
            </h2>
            <p className="text-base text-white/75 max-w-sm leading-relaxed" style={{ fontFamily: "'Inter', sans-serif" }}>
              {carouselSlides[currentSlide].description}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* SA context badge */}
        <div className="mt-8 inline-flex items-center gap-2 w-fit">
            <span className="text-xs text-white/50 uppercase tracking-widest" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
            chuse&apos;s #1 Price Comparison @product of 12 links
          </span>
        </div>
      </div>
    </div>
  );
}
