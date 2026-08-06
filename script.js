const fileInput = document.getElementById('model-file');
const fileName = document.getElementById('file-name');
const orderForm = document.querySelector('.order-form');
const submitButton = orderForm?.querySelector('.submit-button');

// Supabase public browser credentials.
// The publishable key is safe in browser code when Row Level Security is enabled.
const SUPABASE_URL = 'https://bxxrgijespvwjarkdtwp.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_Z9qJCJ03PI1RThpbvoS77Q_VtVgc527';

const STORAGE_BUCKET = 'order-files';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

fileInput?.addEventListener('change', () => {
  const file = fileInput.files?.[0];

  if (!file) {
    fileName.textContent = 'No file selected';
    return;
  }

  const mb = (file.size / 1024 / 1024).toFixed(1);
  fileName.textContent = `${file.name} (${mb} MB)`;
});

function safeFileName(name) {
  return name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uploadFile(file, storagePath) {
  const encodedPath = storagePath
    .split('/')
    .map(encodeURIComponent)
    .join('/');

  const response = await fetch(
    `${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodedPath}`,
    {
      method: 'POST',
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
        'Content-Type': file.type || 'application/octet-stream',
        'x-upsert': 'false'
      },
      body: file
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      errorText || 'The file upload was rejected by Supabase.'
    );
  }
}

async function saveOrder(order) {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/orders`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(order)
  });

  if (!response.ok) {
    const errorText = await response.text();

    throw new Error(
      errorText || 'Supabase rejected the order.'
    );
  }
}

async function sendConfirmationEmail(order) {
  const response = await fetch(
    '/.netlify/functions/send-confirmation',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        customerName: order.customer_name,
        customerEmail: order.email,
        orderNumber: `B3D-${order.id
          .slice(0, 8)
          .toUpperCase()}`,
        material: order.material,
        quantity: order.quantity
      })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();

    console.error(
      'Confirmation email failed:',
      errorText
    );

    return false;
  }

  return true;
}

orderForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  if (!orderForm.reportValidity()) {
    return;
  }

  const originalButtonText = submitButton?.innerHTML;
  const selectedFile = fileInput?.files?.[0] || null;

  if (
    selectedFile &&
    selectedFile.size > MAX_FILE_SIZE
  ) {
    alert(
      'The selected file is larger than 50 MB. ' +
      'Please upload a smaller file or ZIP it first.'
    );

    return;
  }

  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = selectedFile
      ? 'Uploading file...'
      : 'Saving request...';
  }

  const formData = new FormData(orderForm);
  const orderId = crypto.randomUUID();

  let storagePath = null;
  let uploadedFileName = null;
  let uploadedFileSize = null;

  try {
    if (selectedFile) {
      uploadedFileName = selectedFile.name;
      uploadedFileSize = selectedFile.size;

      const cleanedName =
        safeFileName(selectedFile.name) || 'uploaded-file';

      storagePath =
        `${orderId}/${Date.now()}-${cleanedName}`;

      await uploadFile(selectedFile, storagePath);

      if (submitButton) {
        submitButton.textContent = 'Saving request...';
      }
    }

    const order = {
      id: orderId,
      customer_name: String(
        formData.get('name') || ''
      ).trim(),
      email: String(
        formData.get('email') || ''
      ).trim(),
      phone: String(
        formData.get('phone') || ''
      ).trim(),
      project_type: String(
        formData.get('project_type') || ''
      ).trim(),
      material: String(
        formData.get('material') || ''
      ).trim(),
      color: String(
        formData.get('color') || ''
      ).trim(),
      quantity: Number(
        formData.get('quantity') || 1
      ),
      needed_by:
        formData.get('needed_by') || null,
      description: String(
        formData.get('description') || ''
      ).trim(),
      status: 'Submitted',
      file_name: uploadedFileName,
      storage_path: storagePath,
      file_size: uploadedFileSize
    };

    await saveOrder(order);

    if (submitButton) {
      submitButton.textContent =
        'Sending confirmation...';
    }

    await sendConfirmationEmail(order);

    // Continue even if the email fails.
    // The order is already stored safely in Supabase.
    orderForm.submit();
  } catch (error) {
    console.error(
      'Unable to submit order:',
      error
    );

    alert(
      'We could not submit your request. ' +
      'Please try again. If the problem continues, ' +
      'contact Beyond directly.'
    );

    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML =
        originalButtonText ||
        'Submit print request →';
    }
  }
});
