"use client"
import React from "react"
import { useFormik } from "formik"
import { z } from "zod"
import { InputText } from "primereact/inputtext"
import { FileUpload } from "primereact/fileupload"
import { FloatLabel } from "primereact/floatlabel"
import { Button } from "primereact/button"
import { Dropdown } from "primereact/dropdown"
import { useMutation, useQuery } from "@blitzjs/rpc"
import createNewElement from "../(main)/gallery/mutations/createNewElement"
import getProjects from "../queries/getProject"
import { uploadFileDirectlyToS3 } from "../lib/uploadToS3"

const videoSchema = z.object({
  startPlace: z.string().min(1, "Lugar requerido"),
  fileName: z.string().min(1, "Nombre requerido"),
  file: z.instanceof(File, { message: "Debe seleccionar un archivo válido" }).optional(),
  gps: z.instanceof(File, { message: "Debe seleccionar un archivo gps válido" }).optional(),
  project: z.number(),
})

type VideoForm = z.infer<typeof videoSchema>

export default function GalleryForm() {
  const [newElementMutation] = useMutation(createNewElement)
  const [projects, { isLoading }] = useQuery(getProjects, undefined)

  const formik = useFormik<VideoForm>({
    initialValues: { startPlace: "", fileName: "", file: undefined, gps: undefined, project: 0 },
    onSubmit: async (values, { setErrors, setSubmitting }) => {
      try {
        const fileKey = await uploadFileDirectlyToS3(values?.file as any, values.fileName + ".mp4")
        const gpsKey = await uploadFileDirectlyToS3(values?.gps as any, values.fileName + ".gpx")

        const response = await fetch("/api/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fileKey,
            gpsKey,
            startPlace: values.startPlace,
            fileName: values.fileName,
            project: values.project,
          }),
        })

        if (!response.ok) throw new Error("Error procesando en el servidor")
      } catch (err) {
        console.error(err)
        setErrors({ fileName: "Error al subir o procesar archivo." })
      }
      setSubmitting(false)
    },
  })

  return (
    <div className="flex justify-center  w-full h-full ">
      <form
        onSubmit={formik.handleSubmit}
        className="flex flex-col gap-6 bg-white p-8 rounded-2xl shadow-xl w-full "
      >
        <FloatLabel>
          <InputText
            id="startPlace"
            value={formik.values.startPlace}
            onChange={formik.handleChange}
            type="number"
            className="w-full"
          />
          <label htmlFor="startPlace">Kilometro de Inicio</label>
        </FloatLabel>
        {formik.touched.startPlace && formik.errors.startPlace && (
          <small className="text-red-500">{formik.errors.startPlace}</small>
        )}

        <FloatLabel>
          <InputText
            id="fileName"
            value={formik.values.fileName}
            onChange={formik.handleChange}
            className="w-full"
          />
          <label htmlFor="fileName">Nombre del Archivo</label>
        </FloatLabel>
        {formik.touched.fileName && formik.errors.fileName && (
          <small className="text-red-500">{formik.errors.fileName}</small>
        )}

        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Proyecto</label>
          <Dropdown
            options={projects || []}
            value={projects?.find((p) => p.id === formik.values.project) || null}
            onChange={(e) => formik.setFieldValue("project", e.value.id)}
            optionLabel="name"
            placeholder="Seleccionar proyecto"
            className="w-full"
            dropdownIcon="pi pi-chevron-down"
            style={{ width: "100%" }}
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Archivo MP4</label>
          <FileUpload
            mode="basic"
            accept=".mp4"
            customUpload
            auto
            chooseLabel="Seleccionar Video"
            className="w-full [&>span]:w-full [&>span]:justify-center" // CORRECTO
            chooseOptions={{ className: "w-full" }} // ESTO ES CLAVE
            onSelect={(e) => formik.setFieldValue("file", e.files?.[0])}
          />
          {formik.values.file && (
            <span className="text-sm text-gray-600">
              Seleccionado: <b>{formik.values.file.name}</b>
            </span>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-gray-700 font-medium">Archivo GPX</label>
          <FileUpload
            mode="basic"
            accept=".gpx"
            customUpload
            auto
            chooseLabel="Seleccionar Archivo GPX"
            className="w-full [&>span]:w-full [&>span]:justify-center"
            chooseOptions={{ className: "w-full" }}
            onSelect={(e) => formik.setFieldValue("gps", e.files?.[0])}
          />
          {formik.values.gps && (
            <span className="text-sm text-gray-600">
              Seleccionado: <b>{formik.values.gps.name}</b>
            </span>
          )}
        </div>

        <Button label="Guardar" type="submit" className="w-full" />
      </form>
    </div>
  )
}
