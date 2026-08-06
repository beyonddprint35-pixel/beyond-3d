BEYOND 3D ORDERS — SUPABASE FILE UPLOAD VERSION

This version:
1. Uploads the selected model/reference file to the private Supabase Storage bucket: order-files
2. Saves the order details in the public.orders table
3. Saves file_name, storage_path and file_size on the same order row
4. Continues submitting the form to Netlify Forms for owner notifications

Maximum browser upload size configured in script.js: 50 MB

Test after deployment:
- Submit one order with a small STL or image.
- Supabase > Table Editor > orders: confirm file_name and storage_path are populated.
- Supabase > Storage > order-files: confirm the file appears in an order-ID folder.
- Netlify > Forms: confirm the submission appears there too.
