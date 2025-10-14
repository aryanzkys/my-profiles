-- Create security logs table for tracking password reset and security events
CREATE TABLE IF NOT EXISTS public.security_logs (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL,
    action TEXT NOT NULL,
    ip TEXT NOT NULL,
    user_agent TEXT NOT NULL,
    status TEXT NOT NULL,
    details TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster queries by email and timestamp
CREATE INDEX IF NOT EXISTS security_logs_email_idx ON public.security_logs(email);
CREATE INDEX IF NOT EXISTS security_logs_timestamp_idx ON public.security_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS security_logs_action_idx ON public.security_logs(action);

-- Add comment to table
COMMENT ON TABLE public.security_logs IS 'Security audit log for password reset and authentication events';
