"use client";

import React from "react";
import {LazyMotion, domAnimation, m, AnimatePresence} from "framer-motion";
import {cn} from "@heroui/react";

export type HighlightsRotatorProps = {
	items: string[];
	intervalMs?: number;
	className?: string;
};

const slideVariants = {
	enter: {y: 24, opacity: 0},
	center: {y: 0, opacity: 1},
	exit: {y: -24, opacity: 0},
};

export default function HighlightsRotator({
	items,
	intervalMs = 2500,
	className,
}: HighlightsRotatorProps) {
	const [index, setIndex] = React.useState(0);
	const next = React.useCallback(() => {
		setIndex((prev) => (prev + 1) % items.length);
	}, [items.length]);

	React.useEffect(() => {
		if (items.length <= 1) return;
		const id = setInterval(next, intervalMs);
		return () => clearInterval(id);
	}, [next, intervalMs, items.length]);

	if (!items?.length) return null;

	return (
		<LazyMotion features={domAnimation}>
			<div className={cn("relative h-[40px] overflow-hidden", className)}>
				<AnimatePresence mode="wait" initial={false}>
					<m.div
						key={index}
						aria-live="polite"
						aria-atomic="true"
						className="text-default-700 text-xl leading-9 font-medium"
						variants={slideVariants}
						initial="enter"
						animate="center"
						exit="exit"
						transition={{duration: 0.35}}
					>
						{items[index]}
					</m.div>
				</AnimatePresence>
			</div>
		</LazyMotion>
	);
}


