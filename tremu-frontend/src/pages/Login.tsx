import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '@/api/auth'
import { toast, Toaster } from 'sonner'
import { useAuth } from '@/context/AuthContext'
import { useEffect } from 'react'

type LoginFormInputs = {
  email: string
  password: string
}

const Login = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormInputs>()
  const { setUser } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (localStorage.getItem('token')) {
      navigate('/')
    } else {
      document.title = 'Log In | Tremu'
    }
  }, [])

  const onSubmit = async (data: LoginFormInputs) => {
    reset()

    const { data: loginData, error } = await login(data)

    if (error) {
      toast.error(error)
      return
    }

    if (!loginData) {
      toast.error("Something went wrong")
      return
    }

    setUser(loginData.user)
    toast.success(loginData.message)
    localStorage.setItem("token", loginData.token)

    navigate('/')
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100'>
      <div className='w-full max-w-md bg-white rounded shadow p-8'>
        <Toaster position='top-right' />

        <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div>
            <label className="block mb-1 font-semibold" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register("email", {
                required: "Email is required",
                pattern: {
                  value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                  message: "Invalid email format"
                }
              })}
              className={`w-full px-3 py-2 border rounded ${errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label className="block mb-1 font-semibold" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters"
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
                }
              })}
              className={`w-full px-3 py-2 border rounded ${errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Your password"
            />
            {errors.password && <p className="text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition cursor-pointer"
          >
            Login
          </button>

          <p className='text-center text-gray-600 text-sm'>Don&apos;t have an account? <Link to="/register" className='text-blue-600 hover:underline'>Sign up</Link></p>
        </form>
      </div>
    </div>
  )
}

export default Login
