"use client"

import { AuthenticationError, PromiseReturnType } from "blitz"
import Link from "next/link"
import { useMutation } from "@blitzjs/rpc"
import { useSearchParams, useRouter } from "next/navigation"
import type { Route } from "next"
import { InputText } from "primereact/inputtext"
import { Password } from "primereact/password"
import { Button } from "primereact/button"
import { classNames } from "primereact/utils"
import { useFormik } from "formik"
import { z } from "zod"
import login from "../mutations/login"
import { Login } from "../validations"

const validateWithZod = (schema: z.ZodSchema<any>) => (values: any) => {
  const result = schema.safeParse(values)
  if (result.success) return {}
  const errors: Record<string, string> = {}
  result.error.errors.forEach((e) => {
    if (e.path.length > 0) errors[e.path[0].toString()] = e.message
  })
  return errors
}

type LoginFormProps = {
  onSuccess?: (user: PromiseReturnType<typeof login>) => void
}

export const LoginForm = (props: LoginFormProps) => {
  const router = useRouter()
  const next = useSearchParams()?.get("next")
  const [loginMutation] = useMutation(login)

  const formik = useFormik({
    initialValues: { email: "", password: "" },
    validate: validateWithZod(Login), // ✅ usa Zod para validar
    onSubmit: async (values, { setErrors, setSubmitting }) => {
      try {
        await loginMutation(values)
        router.refresh()
        router.push((next as Route) || "/")
      } catch (error: any) {
        setSubmitting(false)
        if (error instanceof AuthenticationError) {
          setErrors({ email: "Invalid credentials" })
        } else {
          setErrors({ email: "Unexpected error, please try again later." })
        }
      }
    },
  })

  return (
    <div className="w-full h-full flex flex-col justify-center gap-5">
      <div>
        <h2 className="text-3xl font-semibold text-center text-indigo-700 mb-6">Visor360</h2>
        <p className="text-center text-gray-500 mb-8">Inicie sesión para continuar con su cuenta</p>
      </div>
      <form onSubmit={formik.handleSubmit} className="w-full flex flex-col gap-5">
        <div>
          <label htmlFor="email" className="block text-gray-700 font-medium mb-2">
            Correo Electronico
          </label>
          <InputText
            id="email"
            name="email"
            type="email"
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            className={classNames(
              "w-full border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-indigo-400 focus:border-indigo-400",
              { "p-invalid": formik.touched.email && formik.errors.email }
            )}
            placeholder="you@example.com"
          />
          {formik.touched.email && formik.errors.email && (
            <small className="text-red-500 text-sm mt-1 block">{formik.errors.email}</small>
          )}
        </div>

        <div className="w-full">
          <label htmlFor="password" className="block text-gray-700 font-medium mb-2">
            Contraseña
          </label>

          <Password
            id="password"
            name="password"
            feedback={false}
            toggleMask
            className="w-full !block" // Forzamos wrapper
            inputClassName="w-full !w-full" // Forzamos input interno
            inputStyle={{ width: "100%" }}
            value={formik.values.password}
            onChange={(e) => formik.setFieldValue("password", e.target.value)}
            onBlur={() => formik.setFieldTouched("password", true)}
            placeholder="••••••••"
          />

          {formik.touched.password && formik.errors.password && (
            <small className="text-red-500 text-sm mt-1 block">{formik.errors.password}</small>
          )}
        </div>

        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-indigo-600 hover:underline font-medium"
          >
            olvidaste tu contrasena?
          </Link>
        </div>

        <Button
          label="Login"
          type="submit"
          className="w-full !bg-indigo-600 hover:!bg-indigo-700 !border-none !rounded-lg !shadow-md !text-white !font-medium !py-2 !transition"
          loading={formik.isSubmitting}
        />
      </form>
      {/* <div className="text-center text-sm text-gray-600 mt-4"> */}
      {/*   <Link href="/signup" className="text-indigo-600 font-semibold hover:underline"> */}
      {/*     registrate */}
      {/*   </Link> */}
      {/* </div> */}
    </div>
  )
}
