import React, { useState, useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useTheme } from '../context/themeContext'

import MODELS from '../utils/models'
import DEVICES from '../utils/devices'

type Precision = 'fp32' | 'fp16' | 'int8' | 'int4'

interface ModelSizeBarChartProps {
  modelSize: number // in GB
  largestModelSize: number // largest model in full precision (fp32)
  modelPrecision: Precision // enum of fp32, fp16, int8, int4
  deviceMemorySet: boolean // true if device memory is set
}

interface InferenceRuntimeLineChartProps {
  availableMemory: AvailableMemory // in GB
  memoryPerInput: number // in GB
}

interface LineChartData {
  seqLength: number
  batchSize: number
}

interface AvailableMemory {
  int4: number
  int8: number
  fp16: number
  fp32: number
}

// Table containing the mapping of backends to precisions
const BackendPrecisionTable = () => {
  return (
    <table className='table-auto border-collapse'>
      <thead>
        <tr>
          <th className='table-cell px-4 py-2'>Backend</th>
          <th className='table-cell px-4 py-2'>GPU</th>
          <th className='table-cell px-4 py-2'>CPU</th>
          <th className='table-cell px-4 py-2'>Accuracy</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td className='table-cell px-4 py-2'>fast</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>⭐⭐⭐</td>
        </tr>
        <tr>
          <td className='table-cell px-4 py-2'>compress-fast</td>
          <td className='table-cell px-4 py-2'>4</td>
          <td className='table-cell px-4 py-2'>8</td>
          <td className='table-cell px-4 py-2'>⭐⭐</td>
        </tr>
        <tr>
          <td className='table-cell px-4 py-2'>compress</td>
          <td className='table-cell px-4 py-2'>4</td>
          <td className='table-cell px-4 py-2'>4</td>
          <td className='table-cell px-4 py-2'>⭐</td>
        </tr>
        <tr>
          <td className='table-cell px-4 py-2'>baseline</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>16</td>
          <td className='table-cell px-4 py-2'>⭐⭐⭐</td>
        </tr>
      </tbody>
    </table>
  )
}

// Bar chart for model footprint (standard version)
function ModelSizeBarChart({
  modelSize,
  largestModelSize,
  modelPrecision,
  deviceMemorySet,
}: ModelSizeBarChartProps) {
  const { theme } = useTheme()
  const chartRef = useRef<SVGSVGElement>(null)

  const width = 600
  const height = 50

  useEffect(() => {
    d3.select(chartRef.current).selectAll('*').remove()

    const svg = d3.select(chartRef.current).attr('width', width).attr('height', height)

    const xScale = d3.scaleLinear().domain([0, largestModelSize]).range([0, width])

    if (modelSize > largestModelSize) {
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .style('stroke', theme === 'dark' ? '#f9fafb' : '#181f26')
        .style('stroke-dasharray', '4, 4')
        .style('stroke-width', '2px')
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
        .text('Out of Memory')
    } else {
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(modelSize))
        .attr('height', height)
        .attr('fill', chooseColor(modelPrecision))

      if (deviceMemorySet) {
        svg
          .append('rect')
          .attr('x', xScale(modelSize))
          .attr('y', 0)
          .attr('width', xScale(largestModelSize - modelSize))
          .attr('height', height)
          .attr('fill', 'transparent')
          .style('stroke', chooseColor(modelPrecision))
          .style('stroke-width', '2px')
      }
    }
  }, [modelSize, largestModelSize, modelPrecision, deviceMemorySet, theme])

  function chooseColor(precision: Precision) {
    const colors = {
      fp32: '#e45f5b',
      fp16: '#ffc068',
      int8: '#71cce9',
      int4: '#383d95',
    }
    return colors[precision] || 'gray'
  }

  return <svg ref={chartRef}></svg>
}

// Line chart for standard inference runtime
function InferenceRuntimeLineChart({
  availableMemory,
  memoryPerInput,
}: InferenceRuntimeLineChartProps) {
  const { theme } = useTheme()
  const chartRef = useRef(null)
  const maxSeqLength = 4096
  const maxBatchSize = 128

  useEffect(() => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 }
    const width = 600 - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom
    const precisions = [
      { name: 'FP32', color: '#e45f5b' },
      { name: 'FP16', color: '#ffc068' },
      { name: 'INT8', color: '#71cce9' },
      { name: 'INT4', color: '#383d95' },
    ]

    const svg = d3.select(chartRef.current)
    svg.selectAll('*').remove()

    const xScale = d3.scaleLinear().domain([0, maxSeqLength]).range([0, width])

    const yScale = d3.scaleLinear().domain([0, maxBatchSize]).range([height, 0])

    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)
    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
      .call(xAxis)

    svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`).call(yAxis)

    svg
      .append('text')
      .attr('transform', `translate(${width / 2 + margin.left}, ${height + margin.top + 40})`)
      .style('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
      .text('Sequence Length')

    svg
      .append('text')
      .attr('transform', `rotate(-90)`)
      .attr('y', 0)
      .attr('x', 0 - height / 2 - margin.top)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
      .text('Batch Size')

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 20}, 20)`)

    precisions.forEach((precision, index) => {
      const legendItem = legend.append('g').attr('transform', `translate(0, ${index * 30})`)

      legendItem
        .append('rect')
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', precision.color)

      legendItem
        .append('text')
        .attr('x', 30)
        .attr('y', 16)
        .text(precision.name)
        .style('font-size', '16px')
        .style('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
        .attr('alignment-baseline', 'middle')
    })
    legend
      .append('rect')
      .attr('class', 'legend-box')
      .attr('width', 80)
      .attr('height', precisions.length * 30)
      .style('fill', 'none')
      .style('stroke-width', '1px')
      .style('stroke', theme === 'dark' ? '#f9fafb' : '#181f26')

    const tooltip = d3.select('#tooltip')

    for (const [precision, memory] of Object.entries(availableMemory)) {
      const sequenceLengths = d3
        .range(1, maxSeqLength, 1)
        .map((seqLength) => {
          return { seqLength, batchSize: memory / (seqLength * memoryPerInput) }
        })
        .filter((seqLength) => seqLength.batchSize <= maxBatchSize)
        .filter((seqLength) => seqLength.batchSize > 1 && seqLength.seqLength > 1)

      const lineGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
      const line = d3
        .line<LineChartData>()
        .x((d) => xScale(d.seqLength))
        .y((d) => yScale(d.batchSize))
        .curve(d3.curveBasis)

      lineGroup
        .append('path')
        .datum(sequenceLengths)
        .attr('fill', 'none')
        .attr('stroke', chooseColor(precision as Precision))
        .attr('stroke-width', 4)
        .attr('d', line)
        .on('mouseover', () => {
          tooltip.style('opacity', 1)
          tooltip.style('background-color', theme === 'dark' ? '#181f26' : '#f9fafb')
        })
        .on('mousemove', (event) => {
          tooltip.selectAll('text').remove()
          const [x, y] = d3.pointer(event)
          const xValue = xScale.invert(x)
          const yValue = yScale.invert(y)
          tooltip
            .html(`Sequence Length: ${xValue.toFixed(0)}<br/>Batch Size: ${yValue.toFixed(0)}`)
            .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY + 10 + 'px')
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0)
        })
    }
  }, [availableMemory, memoryPerInput, theme])

  function chooseColor(precision: Precision) {
    const colors = {
      fp32: '#e45f5b',
      fp16: '#ffc068',
      int8: '#71cce9',
      int4: '#383d95',
    }
    return colors[precision] || 'gray'
  }

  return (
    <>
      <div id='tooltip'></div>
      <svg ref={chartRef} width={600} height={400} />
    </>
  )
}

// Prefill Chunking Model Size Bar Chart
function PrefillChunkingModelSizeBarChart({
  modelSize,
  largestModelSize,
  modelPrecision,
  deviceMemorySet,
  activationMemorySize,
}: {
  modelSize: number // in GB
  largestModelSize: number // largest model in full precision (fp32)
  modelPrecision: Precision // enum of fp32, fp16, int8, int4
  deviceMemorySet: boolean // true if device memory is set
  activationMemorySize: number // additional memory for activations in GB
}) {
  const { theme } = useTheme()
  const chartRef = useRef<SVGSVGElement>(null)

  const width = 600
  const height = 50

  useEffect(() => {
    d3.select(chartRef.current).selectAll('*').remove()

    const svg = d3.select(chartRef.current).attr('width', width).attr('height', height)

    const xScale = d3.scaleLinear().domain([0, largestModelSize]).range([0, width])

    if (modelSize + activationMemorySize > largestModelSize) {
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', width)
        .attr('height', height)
        .attr('fill', 'transparent')
        .style('stroke', theme === 'dark' ? '#f9fafb' : '#181f26')
        .style('stroke-dasharray', '4, 4')
        .style('stroke-width', '2px')
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', height / 2)
        .attr('text-anchor', 'middle')
        .attr('alignment-baseline', 'middle')
        .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
        .text('Out of Memory')
    } else {
      svg
        .append('rect')
        .attr('x', 0)
        .attr('y', 0)
        .attr('width', xScale(modelSize))
        .attr('height', height)
        .attr('fill', chooseColor(modelPrecision))

      svg
        .append('rect')
        .attr('x', xScale(modelSize))
        .attr('y', 0)
        .attr('width', xScale(activationMemorySize))
        .attr('height', height)
        .attr('fill', '#a4b8e0')

      if (deviceMemorySet) {
        svg
          .append('rect')
          .attr('x', xScale(modelSize + activationMemorySize))
          .attr('y', 0)
          .attr('width', xScale(largestModelSize - (modelSize + activationMemorySize)))
          .attr('height', height)
          .attr('fill', 'transparent')
          .style('stroke', chooseColor(modelPrecision))
          .style('stroke-width', '2px')
      }
    }
  }, [modelSize, largestModelSize, modelPrecision, deviceMemorySet, activationMemorySize, theme])

  function chooseColor(precision: Precision) {
    const colors = {
      fp32: '#e45f5b',
      fp16: '#ffc068',
      int8: '#71cce9',
      int4: '#383d95',
    }
    return colors[precision] || 'gray'
  }

  return <svg ref={chartRef}></svg>
}

// Prefill Chunking Inference Runtime Line Chart
function PrefillChunkingInferenceRuntimeLineChart({
  availableMemory,
  memoryPerInput,
  activationMemorySize,
}: {
  availableMemory: AvailableMemory // in GB
  memoryPerInput: number // in GB
  activationMemorySize: number // in GB
}) {
  const { theme } = useTheme()
  const chartRef = useRef(null)
  const maxSeqLength = 4096
  const maxBatchSize = 128

  useEffect(() => {
    const margin = { top: 20, right: 20, bottom: 50, left: 50 }
    const width = 600 - margin.left - margin.right
    const height = 400 - margin.top - margin.bottom
    const precisions = [
      { name: 'FP32', color: '#e45f5b' },
      { name: 'FP16', color: '#ffc068' },
      { name: 'INT8', color: '#71cce9' },
      { name: 'INT4', color: '#383d95' },
    ]

    const svg = d3.select(chartRef.current)
    svg.selectAll('*').remove()

    const xScale = d3.scaleLinear().domain([0, maxSeqLength]).range([0, width])

    const yScale = d3.scaleLinear().domain([0, maxBatchSize]).range([height, 0])

    const xAxis = d3.axisBottom(xScale)
    const yAxis = d3.axisLeft(yScale)
    svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left}, ${margin.top})`)

    svg
      .append('g')
      .attr('transform', `translate(${margin.left}, ${height + margin.top})`)
      .call(xAxis)

    svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`).call(yAxis)

    svg
      .append('text')
      .attr('transform', `translate(${width / 2 + margin.left}, ${height + margin.top + 40})`)
      .style('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
      .text('Sequence Length')

    svg
      .append('text')
      .attr('transform', `rotate(-90)`)
      .attr('y', 0)
      .attr('x', 0 - height / 2 - margin.top)
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
      .text('Batch Size')

    const legend = svg
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${width - 20}, 20)`)

    precisions.forEach((precision, index) => {
      const legendItem = legend.append('g').attr('transform', `translate(0, ${index * 30})`)

      legendItem
        .append('rect')
        .attr('x', 10)
        .attr('y', 10)
        .attr('width', 10)
        .attr('height', 10)
        .style('fill', precision.color)

      legendItem
        .append('text')
        .attr('x', 30)
        .attr('y', 16)
        .text(precision.name)
        .style('font-size', '16px')
        .style('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
        .attr('alignment-baseline', 'middle')
    })
    legend
      .append('rect')
      .attr('class', 'legend-box')
      .attr('width', 80)
      .attr('height', precisions.length * 30)
      .style('fill', 'none')
      .style('stroke-width', '1px')
      .style('stroke', theme === 'dark' ? '#f9fafb' : '#181f26')

    const tooltip = d3.select('#tooltip')

    for (const [precision, memory] of Object.entries(availableMemory)) {
      const sequenceLengths = d3
        .range(1, maxSeqLength, 1)
        .map((seqLength) => {
          return {
            seqLength,
            batchSize: (memory - activationMemorySize) / (seqLength * memoryPerInput),
          }
        })
        .filter((seqLength) => seqLength.batchSize <= maxBatchSize)
        .filter((seqLength) => seqLength.batchSize > 1 && seqLength.seqLength > 1)

      const lineGroup = svg
        .append('g')
        .attr('transform', `translate(${margin.left}, ${margin.top})`)
      const line = d3
        .line<LineChartData>()
        .x((d) => xScale(d.seqLength))
        .y((d) => yScale(d.batchSize))
        .curve(d3.curveBasis)

      lineGroup
        .append('path')
        .datum(sequenceLengths)
        .attr('fill', 'none')
        .attr('stroke', chooseColor(precision as Precision))
        .attr('stroke-width', 4)
        .attr('d', line)
        .on('mouseover', () => {
          tooltip.style('opacity', 1)
          tooltip.style('background-color', theme === 'dark' ? '#181f26' : '#f9fafb')
        })
        .on('mousemove', (event) => {
          tooltip.selectAll('text').remove()
          const [x, y] = d3.pointer(event)
          const xValue = xScale.invert(x)
          const yValue = yScale.invert(y)
          tooltip
            .html(`Sequence Length: ${xValue.toFixed(0)}<br/>Batch Size: ${yValue.toFixed(0)}`)
            .attr('fill', theme === 'dark' ? '#f9fafb' : '#181f26')
            .style('left', event.pageX + 10 + 'px')
            .style('top', event.pageY + 10 + 'px')
        })
        .on('mouseout', () => {
          tooltip.style('opacity', 0)
        })
    }
  }, [availableMemory, memoryPerInput, activationMemorySize, theme])

  function chooseColor(precision: Precision) {
    const colors = {
      fp32: '#e45f5b',
      fp16: '#ffc068',
      int8: '#71cce9',
      int4: '#383d95',
    }
    return colors[precision] || 'gray'
  }

  return (
    <>
      <div id='tooltip'></div>
      <svg ref={chartRef} width={600} height={400} />
    </>
  )
}

// Prefill Chunking Calculator
const PrefillChunkingCalculator = ({
  deviceMemory,
  modelParams,
  hiddenSize,
  numLayers,
  batchSize,
  seqLength,
  maxChunkSize,
  intermediateSize,
}: {
  deviceMemory: number
  modelParams: number
  hiddenSize: number
  numLayers: number
  batchSize: number | null
  seqLength: number | null
  maxChunkSize: number | null
  intermediateSize: number | null
}) => {
  // Function to calculate memory usage based on precision and model parameters
  function calculateMemory(params: number, precision: 'fp32' | 'fp16' | 'int8' | 'int4'): number {
    const paramSize = { fp32: 4, fp16: 2, int8: 1, int4: 0.5 }
    return params * paramSize[precision] // in GB
  }

  function calculateMemoryPerInput(hiddenSize: number, numLayers: number) {
    const memoryPerInput = 4 * hiddenSize * numLayers
    return memoryPerInput / 1_000_000_000 // in GB
  }

  function calculateMemoryNeededForActivations(
    maxChunkSize: number,
    intermediateSize: number,
    hiddenSize: number,
  ) {
    const activationMemorySize = maxChunkSize * 2 * Math.max(2 * intermediateSize, 4 * hiddenSize)
    return activationMemorySize / 1_000_000_000 // in GB
  }

  const memoryPerInput = calculateMemoryPerInput(hiddenSize, numLayers)
  const activationMemorySize = calculateMemoryNeededForActivations(
    maxChunkSize!,
    intermediateSize!,
    hiddenSize,
  )

  return (
    <div>
      <div className='text-2xl'>Prefill Chunking Calculator</div>
      <div className='chart'>
        <div className='flex flex-col items'>
          <div className='text-2xl'>Model Footprint with Prefill Chunking</div>
        </div>
        <div className='chart-row my-8'>
          <div className='chart-row-title'>FP32</div>
          <PrefillChunkingModelSizeBarChart
            modelSize={calculateMemory(modelParams, 'fp32')}
            largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp32')}
            modelPrecision='fp32'
            deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
            activationMemorySize={activationMemorySize}
          />
          <div className='chart-row-size ml-8'>
            {(calculateMemory(modelParams, 'fp32') + activationMemorySize).toFixed(2)}{' '}
            {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
          </div>
        </div>

        <div className='chart-row my-8'>
          <div className='chart-row-title'>FP16</div>
          <PrefillChunkingModelSizeBarChart
            modelSize={calculateMemory(modelParams, 'fp16')}
            largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp16')}
            modelPrecision='fp16'
            deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
            activationMemorySize={activationMemorySize}
          />
          <div className='chart-row-size ml-8'>
            {(calculateMemory(modelParams, 'fp16') + activationMemorySize).toFixed(2)}{' '}
            {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
          </div>
        </div>

        <div className='chart-row my-8'>
          <div className='chart-row-title'>INT8</div>
          <PrefillChunkingModelSizeBarChart
            modelSize={calculateMemory(modelParams, 'int8')}
            largestModelSize={deviceMemory || calculateMemory(modelParams, 'int8')}
            modelPrecision='int8'
            deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
            activationMemorySize={activationMemorySize}
          />
          <div className='chart-row-size ml-8'>
            {(calculateMemory(modelParams, 'int8') + activationMemorySize).toFixed(2)}{' '}
            {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
          </div>
        </div>

        <div className='chart-row my-8'>
          <div className='chart-row-title'>INT4</div>
          <PrefillChunkingModelSizeBarChart
            modelSize={calculateMemory(modelParams, 'int4')}
            largestModelSize={deviceMemory || calculateMemory(modelParams, 'int4')}
            modelPrecision='int4'
            deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
            activationMemorySize={activationMemorySize}
          />
          <div className='chart-row-size ml-8'>
            {(calculateMemory(modelParams, 'int4') + activationMemorySize).toFixed(2)}{' '}
            {deviceMemory !== null && deviceMemory > 0 ? `/ ${deviceMemory} ` : null}GB
          </div>
        </div>

      </div>
      <div className='chart'>
        <div className='flex flex-col items-center'>
          <div className='text-2xl'>Maximum Batch Size / Sequence Length with Prefill Chunking</div>
        </div>
        <PrefillChunkingInferenceRuntimeLineChart
          availableMemory={{
            int4: deviceMemory - calculateMemory(modelParams, 'int4'),
            int8: deviceMemory - calculateMemory(modelParams, 'int8'),
            fp16: deviceMemory - calculateMemory(modelParams, 'fp16'),
            fp32: deviceMemory - calculateMemory(modelParams, 'fp32'),
          }}
          memoryPerInput={memoryPerInput}
          activationMemorySize={activationMemorySize}
        />
      </div>
    </div>
  )
}

// Calculator page with toggle feature
const Calculator = () => {
  // Model Parameters (billions)
  const [modelParams, setModelParams] = useState<number | null>(null)
  const [hiddenSize, setHiddenSize] = useState<number | null>(null)
  const [numLayers, setNumLayers] = useState<number | null>(null)

  // Device Memory (GB)
  const [deviceMemory, setDeviceMemory] = useState<number | null>(null)

  // Inputs
  const [batchSize, setBatchSize] = useState<number | null>(null)
  const [seqLength, setSeqLength] = useState<number | null>(null)

  // Prefill Chunking Inputs
  const [maxChunkSize, setMaxChunkSize] = useState<number | null>(null)
  const [intermediateSize, setIntermediateSize] = useState<number | null>(null)

  // Toggle between standard calculator and prefill chunking calculator
  const [isPrefillChunking, setIsPrefillChunking] = useState<boolean>(false)

  // Toggle between model selection and custom model input
  const [modelSelectionTab, setModelSelectionTab] = useState<boolean>(true)

  // Toggle between device selection and custom device input
  const [deviceSelectionTab, setDeviceSelectionTab] = useState<boolean>(true)

  // Calculate model memory
  function calculateMemory(params: number, precision: Precision) {
    const paramSize = { fp32: 4, fp16: 2, int8: 1, int4: 0.5 }
    return params * paramSize[precision] // in GB
  }

  // Calculate memory per input (sequence length and batch size)
  function calculateMemoryPerInput(hiddenSize: number, numLayers: number) {
    const memoryPerInput = 4 * hiddenSize * numLayers
    return memoryPerInput / 1_000_000_000 // in GB
  }

  // Calculate maximum batch size / sequence length
  function calculateMaxInputSize(
    deviceMemory: number,
    modelParams: number,
    hiddenSize: number,
    numLayers: number,
    precision: Precision,
    inputSize: number,
  ) {
    const memoryPerInput = calculateMemoryPerInput(hiddenSize, numLayers)
    const availableMemory = deviceMemory - calculateMemory(modelParams, precision)
    return Math.floor(availableMemory / (memoryPerInput * inputSize))
  }

  // Check if memory is valid for batch size / sequence length combination
  function calculateMemoryValid(
    deviceMemory: number,
    modelParams: number,
    hiddenSize: number,
    numLayers: number,
    precision: Precision,
    batchSize: number,
    seqLength: number,
  ) {
    const memoryPerInput = calculateMemoryPerInput(hiddenSize, numLayers)
    const availableMemory = deviceMemory - calculateMemory(modelParams, precision)
    return availableMemory >= memoryPerInput * batchSize * seqLength
  }

  return (

<div className="flex flex-col items-center justify-center min-h-screen px-4">
  {/* Toggle Button */}
  <div className="mb-4 flex space-x-4">
    <button
      className={`${
        !isPrefillChunking ? 'calculator-input-tab-active' : 'calculator-input-tab'
      }`}
      onClick={() => setIsPrefillChunking(false)}
    >
      Standard Calculator
    </button>
    <button
      className={`${
        isPrefillChunking ? 'calculator-input-tab-active' : 'calculator-input-tab'
      }`}
      onClick={() => setIsPrefillChunking(true)}
    >
         Calculator
    </button>
  </div>

  {/* Model Memory Calculator */}
  <div className="w-full max-w-4xl">
    <div className="text-4xl mb-4 text-center">Model Memory Calculator</div>
    <div className="mb-6 text-center">
      Use our Model Memory Calculator to help you estimate the memory footprint of your model for different precisions and the maximum batch size / sequence length combination you can run on your device.
    </div>

    {/* Model and Device Selection */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
      {/* Model Selection */}
      <div className="calculator-input-box">
        <div className="text-2xl calculator-input-title">Model</div>
        <div className="calculator-input-content">
          <div className="mb-2">
            <button
              className={`${
                modelSelectionTab ? 'calculator-input-tab-active' : 'calculator-input-tab'
              }`}
              onClick={() => setModelSelectionTab(true)}
            >
              Model Selection
            </button>
            <button
              className={`${
                modelSelectionTab ? 'calculator-input-tab' : 'calculator-input-tab-active'
              }`}
              onClick={() => setModelSelectionTab(false)}
            >
              Custom Model
            </button>
          </div>
          <div>
            {modelSelectionTab ? (
              <>
                <label htmlFor="model">Select a Model</label>
                <select
                  id="model"
                  className="calculator-select"
                  onChange={(e) => {
                    setModelParams(Number(e.target.value));
                    setHiddenSize(
                      Number(
                        e.target.options[e.target.selectedIndex].getAttribute('data-hiddenSize')
                      )
                    );
                    setNumLayers(
                      Number(
                        e.target.options[e.target.selectedIndex].getAttribute('data-numLayers')
                      )
                    );
                  }}
                >
                  <option value="">None selected</option>
                  {MODELS.map((model) => (
                    <option
                      key={model.name}
                      value={model.params}
                      data-hiddenSize={model.hidden_size}
                      data-numLayers={model.num_hidden_layers}
                    >
                      {model.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label htmlFor="modelParams">Model Parameters (in billions)</label>
                <input
                  type="number"
                  id="modelParams"
                  className="calculator-input mb-2"
                  placeholder="e.g. 7 (for LLaMA-7B)"
                  value={modelParams || ''}
                  min={0}
                  onChange={(e) => setModelParams(Number(e.target.value))}
                />
                <label htmlFor="hiddenSize">Hidden Size</label>
                <input
                  type="number"
                  id="hiddenSize"
                  className="calculator-input mb-2"
                  placeholder="e.g. 4096 (for LLaMA-7B)"
                  value={hiddenSize || ''}
                  min={1}
                  onChange={(e) => setHiddenSize(Number(e.target.value))}
                />
                <label htmlFor="numLayers">Number of Layers</label>
                <input
                  type="number"
                  id="numLayers"
                  className="calculator-input"
                  placeholder="e.g. 32 (for LLaMA-7B)"
                  value={numLayers || ''}
                  min={1}
                  onChange={(e) => setNumLayers(Number(e.target.value))}
                />
              </>
            )}
          </div>
        </div>
      </div>

      {/* Device Selection */}
      <div className="calculator-input-box">
        <div className="text-2xl calculator-input-title">Device</div>
        <div className="calculator-input-content">
          <div className="mb-2">
            <button
              className={`${
                deviceSelectionTab ? 'calculator-input-tab-active' : 'calculator-input-tab'
              }`}
              onClick={() => {
                setDeviceSelectionTab(true);
                setDeviceMemory(null);
              }}
            >
              Device Selection
            </button>
            <button
              className={`${
                deviceSelectionTab ? 'calculator-input-tab' : 'calculator-input-tab-active'
              }`}
              onClick={() => {
                setDeviceSelectionTab(false);
                setDeviceMemory(null);
              }}
            >
              Custom Device
            </button>
          </div>
          <div>
            {deviceSelectionTab ? (
              <>
                <label htmlFor="device">Select a Device</label>
                <select
                  id="device"
                  className="calculator-select"
                  onChange={(e) => setDeviceMemory(Number(e.target.value))}
                >
                  <option value="">None selected</option>
                  {DEVICES.map((device) => (
                    <option key={device.name} value={device.size}>
                      {device.name}
                    </option>
                  ))}
                </select>
              </>
            ) : (
              <>
                <label htmlFor="deviceMemory">Device RAM (in GB)</label>
                <input
                  type="number"
                  id="deviceMemory"
                  className="calculator-input"
                  placeholder="e.g. 24"
                  value={deviceMemory || ''}
                  min={0}
                  onChange={(e) => setDeviceMemory(Number(e.target.value))}
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>

    {/* Prefill Chunking Settings */}
    {isPrefillChunking && (
      <div className="calculator-input-box mb-6">
        <div className="text-2xl calculator-input-title">Prefill Chunking Settings</div>
        <div className="calculator-input-content">
          <label htmlFor="maxChunkSize">Max Chunk Size</label>
          <input
            type="number"
            id="maxChunkSize"
            className="calculator-input mb-2"
            placeholder="e.g. 512"
            value={maxChunkSize || ''}
            min={1}
            onChange={(e) => setMaxChunkSize(Number(e.target.value))}
          />
          <label htmlFor="intermediateSize">Intermediate Size</label>
          <input
            type="number"
            id="intermediateSize"
            className="calculator-input"
            placeholder="e.g. 2048"
            value={intermediateSize || ''}
            min={1}
            onChange={(e) => setIntermediateSize(Number(e.target.value))}
          />
        </div>
      </div>
    )}

    {/* Charts Section */}
    {isPrefillChunking ? (
      <PrefillChunkingCalculator
        deviceMemory={deviceMemory!}
        modelParams={modelParams!}
        hiddenSize={hiddenSize!}
        numLayers={numLayers!}
        batchSize={batchSize}
        seqLength={seqLength}
        maxChunkSize={maxChunkSize}
        intermediateSize={intermediateSize}
      />
    ) : (
      hiddenSize && numLayers && deviceMemory && modelParams && (
        <>
          {/* Model Footprint Chart */}
          <div className="chart mb-8">
            <div className="text-2xl text-center mb-4">Model Footprint</div>
            <div className="space-y-8">
              <div className="chart-row">

                <div className="chart-row-title">FP32</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'fp32')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp32')}
                  modelPrecision="fp32"
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className="chart-row-size ml-8">
                  {calculateMemory(modelParams, 'fp32')} {deviceMemory ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>

              {/* FP16 */}
              <div className="chart-row">
                <div className="chart-row-title">FP16</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'fp16')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'fp16')}
                  modelPrecision="fp16"
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className="chart-row-size ml-8">
                  {calculateMemory(modelParams, 'fp16')} {deviceMemory ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>

              {/* INT8 */}
              <div className="chart-row">
                <div className="chart-row-title">INT8</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'int8')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'int8')}
                  modelPrecision="int8"
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className="chart-row-size ml-8">
                  {calculateMemory(modelParams, 'int8')} {deviceMemory ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>

              {/* INT4 */}
              <div className="chart-row">
                <div className="chart-row-title">INT4</div>
                <ModelSizeBarChart
                  modelSize={calculateMemory(modelParams, 'int4')}
                  largestModelSize={deviceMemory || calculateMemory(modelParams, 'int4')}
                  modelPrecision="int4"
                  deviceMemorySet={deviceMemory !== null && deviceMemory > 0}
                />
                <div className="chart-row-size ml-8">
                  {calculateMemory(modelParams, 'int4')} {deviceMemory ? `/ ${deviceMemory} ` : null}GB
                </div>
              </div>
            </div>
          </div>

          {/* Maximum Batch Size / Sequence Length Chart */}
          <div className="chart mb-8">
            <div className="text-2xl text-center mb-4">Maximum Batch Size / Sequence Length</div>
            <div className="flex flex-col items-center">
              <InferenceRuntimeLineChart
                availableMemory={{
                  int4: deviceMemory - calculateMemory(modelParams, 'int4'),
                  int8: deviceMemory - calculateMemory(modelParams, 'int8'),
                  fp16: deviceMemory - calculateMemory(modelParams, 'fp16'),
                  fp32: deviceMemory - calculateMemory(modelParams, 'fp32'),
                }}
                memoryPerInput={calculateMemoryPerInput(hiddenSize, numLayers)}
              />
              <div className="chart-side-panel ml-4 pt-4 w-full max-w-xs">
                {/* Batch Size and Sequence Length Inputs */}
              </div>
            </div>
          </div>
        </>
      )
    )}
  </div>
</div>



  )
}

export default Calculator
