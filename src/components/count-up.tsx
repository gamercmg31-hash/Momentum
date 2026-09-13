import { useEffect } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

export default function CountUp({
  value,
  className,
  prefix = "",
  suffix = "",
  decimals = 0,
}: {
  value: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}) {
  const spring = useSpring(0, { stiffness: 80, damping: 18, mass: 0.6 });
  const text = useTransform(spring, (v) => {
    const num = new Intl.NumberFormat("en-US", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(v);
    return `${prefix}${num}${suffix}`;
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  return <motion.span className={className}>{text}</motion.span>;
}
