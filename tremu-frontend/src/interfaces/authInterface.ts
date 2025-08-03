export interface LoginResponse {
  message: string
  token: string
  user: {
    id: number
    name: string
    email: string
  }
}

export interface RegisterResponse {
  message: string
  user: {
    id: number,
    name: string,
    email: string
  }
}