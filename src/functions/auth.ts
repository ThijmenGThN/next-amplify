"use server"

import { getPayload } from 'payload'
import config from '@payload-config'
import { cookies } from 'next/headers'

export async function getCurrentUser() {
  try {
    const payload = await getPayload({ config })
    const cookieStore = await cookies()
    
    const { user } = await payload.auth({
      headers: {
        cookie: cookieStore.toString(),
      },
    })

    if (!user) {
      return null
    }

    return {
      id: user.id,
      email: user.email,
      firstname: user.firstname,
      lastname: user.lastname,
      role: user.role,
      stripeCustomerId: user.stripeCustomerId,
      subscriptionStatus: user.subscriptionStatus,
      currentProduct: user.currentProduct
    }
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

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