export interface MethodInfo {
  name: string;
  signature: string;
  filePath: string;
  line: number;
}

export interface FileMethodIndex {
  filePath: string;
  methods: MethodInfo[];
}

export interface GenerationRequest {
  filePath: string;
  methods: MethodInfo[];
  language?: string;
}
