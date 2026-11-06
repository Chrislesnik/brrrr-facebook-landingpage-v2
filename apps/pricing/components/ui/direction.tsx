"use client";

import { Direction } from "radix-ui";
import type React from "react";

type DirectionProviderProps = React.ComponentProps<
  typeof Direction.DirectionProvider
>;

export const DirectionProvider = (
  props: Omit<DirectionProviderProps, "dir"> & {
    dir?: DirectionProviderProps["dir"];
    /** The reading direction it sets for everything inside it. */
    direction?: DirectionProviderProps["dir"];
  }
) => {
  const { dir, direction, children } = props;

  return (
    <Direction.DirectionProvider dir={direction ?? dir ?? "ltr"}>
      {children}
    </Direction.DirectionProvider>
  );
};

const { useDirection: useRadixDirection } = Direction;

export const useDirection = useRadixDirection;
