// Contains information about pre-set models
type ModelInfo = {
  name: string
  params: number
  hidden_size: number
  num_hidden_layers: number
}

export const MODELS: ModelInfo[] = [
  {
    name: 'LLaMA 2 (7B)',
    params: 7,
    hidden_size: 4096,
    num_hidden_layers: 32,
  },
  {
    name: 'LLaMA 2 (13B)',
    params: 13,
    hidden_size: 5120,
    num_hidden_layers: 40,
  },
  {
    name: 'LLaMA 2 (70B)',
    params: 70,
    hidden_size: 8192,
    num_hidden_layers: 80,
  },
]

export default MODELS
