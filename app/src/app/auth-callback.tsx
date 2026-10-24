import { Redirect } from 'expo-router';

/** Landing route for the `echo://auth-callback` deep link after Google sign-in. signInWithGoogle() exchanges the code; this just moves on. */
export default function AuthCallback() {
  return <Redirect href="/" />;
}
