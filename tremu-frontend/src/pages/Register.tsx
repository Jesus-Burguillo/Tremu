import { useForm } from "react-hook-form"
import { Link, redirect } from "react-router-dom"
import { Toaster, toast } from 'sonner'
import { register as registerApi } from "@/api/auth"

type RegisterFormInputs = {
  email: string,
  name: string,
  password: string
  confirmPassword: string
}

const Register = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<RegisterFormInputs>()

  const onSubmit = async (data: RegisterFormInputs) => {
    if (data.password !== data.confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    const { data: registerData, error } = await registerApi(data)

    if (error) {
      toast.error(error)
    }

    if (!registerData) {
      toast.error("Something went wrong")
      return
    }

    reset()

    toast.success("Registration successful, you can now log in")
    redirect("/login")
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded shadow p-8">
        <Toaster position="top-right" />

        <h2 className="text-2xl font-bold mb-6 text-center">Sign Up</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
              className={`w-full px-3 py-2 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="you@example.com"
            />
            {errors.email && <p className="text-red-500 mt-1">{errors.email.message}</p>}
          </div>

          <div>
            <label htmlFor="name" className="block mb-1 font-semibold">Name</label>
            <input
              id="name"
              type="text"
              {...register("name", {
                required: "Name is required",
                minLength: {
                  value: 2,
                  message: "Name must be at least 2 characters"
                },
                maxLength: {
                  value: 50,
                  message: "Name must be less than 50 characters"
                }
              })}
              className={`w-full px-3 py-2 border rounded ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Your name"
            />
            {errors.name && <p className="text-red-500 mt-1">{errors.name.message}</p>}
          </div>

          <div>
            <label htmlFor="pass" className="block mb-1 font-semibold">Password</label>
            <input
              id="pass"
              type="password"
              {...register("password", {
                required: "Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters long"
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
                }
              })}
              className={`w-full px-3 py-2 border rounded ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Your password"
            />
            {errors.password && <p className="text-red-500 mt-1">{errors.password.message}</p>}
          </div>

          <div>
            <label htmlFor="confirmPass" className="block mb-1 font-semibold">Confirm Password</label>
            <input
              id="confirmPass"
              type="password"
              {...register("confirmPassword", {
                required: "Confirm Password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters long"
                },
                pattern: {
                  value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character"
                }
              })}
              className={`w-full px-3 py-2 border rounded ${errors.confirmPassword ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Your password"
            />
            {errors.confirmPassword && <p className="text-red-500 mt-1">{errors.confirmPassword.message}</p>}
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition cursor-pointer"
          >
            Sign Up
          </button>

          <p className="text-center text-gray-600 text-sm">Already have an account? <Link to={"/login"} className="text-blue-600 hover:underline">Sign In</Link></p>
        </form>
      </div>
    </div>
  )
}

export default Register