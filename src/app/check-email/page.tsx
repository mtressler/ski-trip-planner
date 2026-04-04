import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail } from "lucide-react";

export default function CheckEmailPage() {
  return (
    <div className="flex items-center justify-center flex-1 px-4 py-12">
      <Card className="w-full max-w-sm text-center">
        <CardHeader>
          <div className="flex justify-center mb-2">
            <Mail className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>
            We sent you a magic link. Click the link in the email to sign in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you don&apos;t see the email, check your spam folder.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
