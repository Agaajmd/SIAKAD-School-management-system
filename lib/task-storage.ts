import type { Task, TaskSubmission } from "@/lib/data-model"
const runtimeTasks: Task[] = []
const runtimeSubmissions: TaskSubmission[] = []

export const getStoredTasks = (): Task[] => {
  return [...runtimeTasks]
}

export const setStoredTasks = (tasks: Task[]) => {
  runtimeTasks.splice(0, runtimeTasks.length, ...tasks)
}

export const getStoredTaskSubmissions = (): TaskSubmission[] => {
  return [...runtimeSubmissions]
}

export const setStoredTaskSubmissions = (submissions: TaskSubmission[]) => {
  runtimeSubmissions.splice(0, runtimeSubmissions.length, ...submissions)
}
