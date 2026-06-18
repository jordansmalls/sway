import * as React from "react"
import * as RechartsPrimitive from "recharts"
import type {
  TooltipContentProps,
  TooltipPayloadEntry,
  TooltipValueType,
} from "recharts"

import { cn } from "@/lib/utils"

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode
    color?: string
  }
}

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null)

function useChart() {
  const context = React.useContext(ChartContext)

  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />")
  }

  return context
}

function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  id?: string
  config: ChartConfig
  children: React.ComponentProps<
    typeof RechartsPrimitive.ResponsiveContainer
  >["children"]
}) {
  const uniqueId = React.useId()
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`

  return (
    <ChartContext.Provider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn(
          "flex aspect-video min-h-0 min-w-0 justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-grid_line]:stroke-border/70 [&_.recharts-layer]:outline-hidden [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-hidden [&_.recharts-surface]:outline-hidden",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <RechartsPrimitive.ResponsiveContainer
          minWidth={0}
          minHeight={0}
          initialDimension={{ width: 0, height: 0 }}
        >
          {children}
        </RechartsPrimitive.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  )
}

function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const colorConfig = Object.entries(config).filter(
    ([, itemConfig]) => itemConfig.color
  )

  if (!colorConfig.length) {
    return null
  }

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
[data-chart=${id}] {
${colorConfig
  .map(([key, itemConfig]) => `  --color-${key}: ${itemConfig.color};`)
  .join("\n")}
}
`,
      }}
    />
  )
}

const ChartTooltip = RechartsPrimitive.Tooltip

function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  indicator = "dot",
}: Partial<TooltipContentProps<TooltipValueType, string | number>> &
  Pick<React.ComponentProps<"div">, "className"> & {
    indicator?: "line" | "dot"
  }) {
  const { config } = useChart()

  if (!active || !payload?.length) {
    return null
  }

  return (
    <div
      className={cn(
        "grid min-w-32 items-start gap-1.5 rounded-lg border bg-background px-2.5 py-2 text-xs shadow-xl",
        className
      )}
    >
      {label ? (
        <div className="font-medium text-foreground">{String(label)}</div>
      ) : null}
      <div className="grid gap-1.5">
        {payload.map((item: TooltipPayloadEntry) => {
          const key = String(item.dataKey ?? item.name ?? "")
          const itemConfig = config[key]
          const color = item.color ?? item.payload?.fill ?? itemConfig?.color

          return (
            <div
              key={key}
              className="flex min-w-0 items-center gap-2 text-muted-foreground"
            >
              <span
                className={cn(
                  "shrink-0 rounded-[2px] border-(--color-border) bg-(--color-bg)",
                  indicator === "dot" ? "size-2.5" : "h-2.5 w-1"
                )}
                style={
                  {
                    "--color-bg": color,
                    "--color-border": color,
                  } as React.CSSProperties
                }
              />
              <span className="truncate">
                {itemConfig?.label ?? item.name ?? key}
              </span>
              {item.value !== undefined ? (
                <span className="ml-auto font-mono font-medium text-foreground">
                  {Number(item.value).toLocaleString()}
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export { ChartContainer, ChartTooltip, ChartTooltipContent }
