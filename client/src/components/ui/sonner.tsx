import { Toaster as Sonner, type ToasterProps } from "sonner"

import { useTheme } from "@/components/theme/theme-provider"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme } = useTheme()

  return <Sonner theme={theme} {...props} />
}

export { Toaster }
