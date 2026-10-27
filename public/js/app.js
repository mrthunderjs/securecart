document.querySelectorAll('form[action*="/delete"]').forEach(form=>form.addEventListener('submit',e=>{if(!confirm('Delete this product?'))e.preventDefault()}));
