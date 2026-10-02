import { Toaster as Sonner, type ToasterProps } from 'sonner'
import { useThemeStore } from '@/lib/theme'

const Toaster = (props: ToasterProps) => {
  const theme = useThemeStore((s) => s.theme)
  return <Sonner theme={theme} className="toaster group" {...props} />
}

export { Toaster }
