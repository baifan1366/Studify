-- 允许认证用户上传到 post-attachments bucket
create policy "Allow authenticated uploads"
on storage.objects
for insert
to authenticated
with check (bucket_id = 'post-attachments');

-- 允许用户读取 bucket 内所有文件
create policy "Allow public read"
on storage.objects
for select
using (bucket_id = 'post-attachments');

-- 允许认证用户读取 hashtags 表
CREATE POLICY "Allow authenticated users to read hashtags"
ON public.hashtags
FOR SELECT
TO authenticated
USING (true);

-- 允许用户读取 bucket 内所有文件
create policy "Allow public read"
on storage.objects
for select
using (bucket_id = 'post-attachments');

-- 允许已登录用户上传（仅自己）
CREATE POLICY "Allow authenticated upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comment-attachments'
);

-- 允许已登录用户删除自己的文件
CREATE POLICY "Allow authenticated delete own files"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'comment-attachments'
  AND auth.uid() = owner
);