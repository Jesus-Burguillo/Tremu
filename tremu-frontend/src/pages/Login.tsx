import { useForm } from 'react-hook-form'

type LoginFormInputs = {
  email: string
  password: string
}

const Login = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<LoginFormInputs>()

  const onSubmit = (data: LoginFormInputs) => {
    console.log('Login form submitted:', data)
    // TODO - Handle login logic
    reset()
  }

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100'>
      <div className='w-full max-w-md bg-white rounded shadow p-8'>
        <h2 className="text-2xl font-bold mb-6 text-center">Login</h2>

        <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
          <div>
            <label className="block mb-1 font-semibold" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              {...register("email", { required: "Email is required" })}
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
              {...register("password", { required: "Password is required" })}
              className={`w-full px-3 py-2 border rounded ${errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
              placeholder="Your password"
            />
            {errors.password && <p className="text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Login
          </button>
        </form>
      </div>
    </div>
  )
}

export default Login
