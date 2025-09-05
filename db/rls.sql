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