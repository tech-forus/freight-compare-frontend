// src/pages/UserSelect.tsx
import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { User, Truck } from 'lucide-react';

interface ChoiceCardProps {
  illustration: React.ReactNode;
  title: string;
  description: string;
  linkTo: string;
  glowColor: string; // e.g. '#6366f1' or '#f59e0b'
}

const ChoiceCard: React.FC<ChoiceCardProps> = ({
  illustration, title, description, linkTo, glowColor
}) => {
  const ref = useRef<HTMLDivElement>(null);

  // 3D tilt setup (unchanged)
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xSpring = useSpring(x, { stiffness: 300, damping: 20 });
  const ySpring = useSpring(y, { stiffness: 300, damping: 20 });
  const rotateX = useTransform(ySpring, [-0.5, 0.5], ['7deg', '-7deg']);
  const rotateY = useTransform(xSpring, [-0.5, 0.5], ['-7deg', '7deg']);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const { left, top, width, height } = ref.current.getBoundingClientRect();
    x.set((e.clientX - left) / width  - 0.5);
    y.set((e.clientY - top)  / height - 0.5);
  };
  const handleMouseLeave = () => { x.set(0); y.set(0); };

  // pick Tailwind classes based on glowColor
  const isBlue = glowColor === '#6366f1';
  const border = isBlue ? 'border-indigo-500' : 'border-amber-500';
  const text   = isBlue ? 'text-indigo-500' : 'text-amber-500';
  const hoverBg= isBlue ? 'hover:bg-indigo-500' : 'hover:bg-amber-500';

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ rotateX, rotateY, transformStyle: 'preserve-3d' }}
      className="relative"
    >
      {/* THIS wrapper does the clipping */}
      <div className="overflow-hidden rounded-2xl shadow-xl">
        <Link
          to={linkTo}
          className="group block w-full max-w-sm h-[28rem] bg-white relative"
        >
          {/* glowing border */}
          <div
            className={`absolute inset-0 border-2 ${border} transition-colors duration-300 group-hover:${border}/50 rounded-2xl`}
            style={{ transform: 'translateZ(-1px)' }}
          />

          {/* shine (will be clipped) */}
          <div className="absolute top-0 left-0 w-2/3 h-full opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div
              className="absolute -top-1/4 -left-1/4 w-[150%] h-[150%] bg-white/50 -rotate-45"
              style={{
                backgroundImage: `linear-gradient(to right, transparent, ${glowColor}20, transparent)`,
                animation: 'shine 2s infinite ease-out'
              }}
            />
          </div>

          {/* content */}
          <div className="relative z-10 p-8 flex flex-col items-center text-center h-full">
            <motion.div whileHover={{ scale: 0.95 }}>
              <div
                className={`transition-colors duration-300 text-gray-300 group-hover:${text}`}
                style={{ transform: 'translateZ(50px)' }}
              >
                {React.cloneElement(illustration as React.ReactElement, {
                  className: 'w-36 h-36',
                  strokeWidth: 0.75
                })}
              </div>
            </motion.div>
            <h3 className="text-3xl font-bold text-gray-800 mt-6">{title}</h3>
            <p className="text-gray-500 mt-2 flex-grow">{description}</p>

            <div
              className={`
                mt-6 font-semibold px-6 py-2 rounded-full border-2 transition
                ${border} ${text} ${hoverBg} hover:text-white
              `}
            >
              Continue →
            </div>
          </div>
        </Link>
      </div>
    </motion.div>
  );
};

export default function UserSelect() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-white overflow-hidden relative">
      {/* page background blooms (optional) */}
      <div className="absolute inset-0 z-0 bg-gray-50">
        <div className="absolute top-[-20%] left-[-20%] w-[40rem] h-[40rem] bg-gradient-radial from-blue-200/50 to-transparent blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[40rem] h-[40rem] bg-gradient-radial from-yellow-200/50 to-transparent blur-3xl" />
      </div>

      {/* heading */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 text-center mb-16"
      >
        <h1 className="text-5xl md:text-6xl font-bold text-gray-800">
          Let's Get Started
        </h1>
        <p className="text-lg text-gray-600 mt-4 max-w-xl">
          Select the profile that best describes you…
        </p>
      </motion.div>

      {/* cards */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.2 } } }}
        className="relative z-10 flex flex-col md:flex-row gap-12"
      >
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}>
          <ChoiceCard
            illustration={<User />}
            title="Shipper"
            description="Book shipments, get instant quotes, track your cargo."
            linkTo="/signup"
            glowColor="#6366f1"
          />
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, scale: 0.9 }, visible: { opacity: 1, scale: 1 } }}>
          <ChoiceCard
            illustration={<Truck />}
            title="Transporter"
            description="Manage your fleet, access our load board, boost profits."
            linkTo="/transporter-signin"
            glowColor="#f59e0b"
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
