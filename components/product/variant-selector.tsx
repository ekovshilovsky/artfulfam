"use client"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import type { ProductOption, ProductVariant } from "@/lib/shopify/types"
import { useState, useMemo, useEffect } from "react"

interface VariantSelectorProps {
  options: ProductOption[]
  variants: Array<{ node: ProductVariant }>
  onVariantChange: (variant: ProductVariant) => void
}

export function VariantSelector({ options, variants, onVariantChange }: VariantSelectorProps) {
  // Initialize selected options with the first available option for each
  const initialSelections = useMemo(() => {
    const selections: Record<string, string> = {}
    options.forEach((option) => {
      selections[option.name] = option.values[0]
    })
    return selections
  }, [options])

  const [selectedOptions, setSelectedOptions] = useState(initialSelections)

  // Find the matching variant based on selected options
  const currentVariant = useMemo(() => {
    const variant = variants.find((v) => {
      return v.node.selectedOptions.every((option) => selectedOptions[option.name] === option.value)
    })?.node

    return variant || variants[0]?.node
  }, [selectedOptions, variants])

  useEffect(() => {
    if (currentVariant) {
      onVariantChange(currentVariant)
    }
  }, [currentVariant, onVariantChange])

  const handleOptionChange = (optionName: string, value: string) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [optionName]: value,
    }))
  }

  // Check if a specific option value is available
  const isOptionValueAvailable = (optionName: string, value: string) => {
    return variants.some((v) => {
      const matchesOtherOptions = v.node.selectedOptions
        .filter((opt) => opt.name !== optionName)
        .every((opt) => selectedOptions[opt.name] === opt.value)

      const matchesThisOption = v.node.selectedOptions.find((opt) => opt.name === optionName)?.value === value

      return matchesOtherOptions && matchesThisOption && v.node.availableForSale
    })
  }

  if (options.length === 0) return null

  return (
    <div className="space-y-6">
      {options.map((option) => (
        <div key={option.id}>
          <Label className="text-base font-semibold mb-3 block">{option.name}</Label>
          <div className="flex flex-wrap gap-2">
            {option.values.map((value) => {
              const isSelected = selectedOptions[option.name] === value
              const isAvailable = isOptionValueAvailable(option.name, value)

              return (
                <Button
                  key={value}
                  variant={isSelected ? "default" : "outline"}
                  size="lg"
                  disabled={!isAvailable}
                  onClick={() => handleOptionChange(option.name, value)}
                  className="min-w-[4rem]"
                >
                  {value}
                </Button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
