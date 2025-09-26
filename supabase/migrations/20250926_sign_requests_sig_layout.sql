-- Add columns for signature placement/layout
alter table public.sign_requests
  add column if not exists sig_page int,
  add column if not exists sig_anchor text, -- 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  add column if not exists sig_offset_x numeric, -- in PDF user units (pt)
  add column if not exists sig_offset_y numeric, -- in PDF user units (pt)
  add column if not exists sig_scale numeric; -- e.g., 0.35

comment on column public.sign_requests.sig_page is '1-based page number to place signature (default 1)';
comment on column public.sign_requests.sig_anchor is 'Anchor corner for signature placement: bottom-right, bottom-left, top-right, top-left';
comment on column public.sign_requests.sig_offset_x is 'Offset from anchor along X in PDF user units (points)';
comment on column public.sign_requests.sig_offset_y is 'Offset from anchor along Y in PDF user units (points)';
comment on column public.sign_requests.sig_scale is 'Scale factor for signature image (default 0.35)';
