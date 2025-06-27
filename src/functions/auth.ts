"use server"

export async function loginUser(email: string, password: string) {
  try {
    const req = await fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/users/login`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await req.json()

    if (!req.ok) {
      return {
        success: false,
        error: data.message || "Invalid email or password"
      }
    }

    if (data.user) {
      return {
        success: true,
        user: data.user
      }
    }

    return {
      success: false,
      error: "Login failed"
    }
  } catch (error) {
    return {
      success: false,
      error: "An unexpected error occurred. Please try again."
    }
  }
}

export async function registerAndLogin(userData: {
  email: string
  password: string
  firstname: string
  lastname: string
}) {
  try {
    // First create the user
    const { createUser } = await import('./users')
    const user = await createUser(userData)

    if (!user) {
      return {
        success: false,
        error: 'Failed to create account. Email may already be in use.'
      }
    }

    // Then log them in
    const loginResult = await loginUser(userData.email, userData.password)
    
    if (loginResult.success) {
      return {
        success: true,
        user: loginResult.user
      }
    }

    // If login fails after registration, redirect to login page
    return {
      success: true,
      redirectToLogin: true
    }
  } catch (error) {
    return {
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    }
  }
}