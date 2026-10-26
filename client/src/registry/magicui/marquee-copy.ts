import { createContext, useContext } from "react"

export const MarqueeCopyContext = createContext(false)

/** True when rendering inside a repeated copy of an `interactiveCopies` marquee. */
export function useMarqueeCopy() {
  return useContext(MarqueeCopyContext)
}
