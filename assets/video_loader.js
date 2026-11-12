(function preWarmAzure() {
  const existingLink = document.querySelector('link[href^="https://cesglobalaihub"]');
  if (!existingLink) {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://cesglobalaihub.blob.core.windows.net';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
})();

const trackVideoTitles = {
  fin: [
    'Debit & Credit Memo',
    'PO and Accural Data',
    'ADFDI Invoice',
    'ADFDI invoice and IDR',
    'IDR invoice',
    'IDR',
    'Pay in full, Manual payment',
    'Foreign currency and cross currency invoices'
  ],
  finance: [
    'Debit & Credit Memo',
    'PO and Accural Data',
    'ADFDI Invoice',
    'ADFDI invoice and IDR',
    'IDR invoice',
    'IDR',
    'Pay in full, Manual payment',
    'Foreign currency and cross currency invoices'
  ],
};

async function loadVideosForCategory(categoryName, containerId = 'video-list-container') {
  try {
    const apiUrl = `http://127.0.0.1:8000/api/videos/?t=${Date.now()}`;
    const response = await fetch(apiUrl, { cache: 'no-store' });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const container = document.getElementById(containerId);
    if (!container) return;

    container.className = "flex flex-col gap-6";
    container.innerHTML = '';

    const normalizeCategoryName = (value = '') =>
      decodeURIComponent(value)
        .toLowerCase()
        .replace(/[\s+\-&/]+/g, '')
        .trim();

    const safeSearchTerm = normalizeCategoryName(categoryName);

    const categoryVideos = data.videos.filter(video => {
      const safeBlobName = normalizeCategoryName(video.blob_name);
      return safeBlobName.includes(safeSearchTerm);
    });

    if (categoryVideos.length === 0) {
      container.innerHTML = '<p class="text-slate-500">No videos available for this section yet.</p>';
      return;
    }

    categoryVideos.sort((a, b) => {
      const getName = (vid) => {
        const parts = vid.blob_name.replace(/\\/g, '/').split('/');
        return parts[parts.length - 1] || vid.title;
      };
      return getName(a).localeCompare(getName(b), undefined, { numeric: true, sensitivity: 'base' });
    });

    const totalVideos = categoryVideos.length;
    let completedVideos = 0;

    categoryVideos.forEach(video => {
      if (localStorage.getItem('completed_' + video.blob_name) === 'true') {
        completedVideos++;
      }
    });

    const progressPercentage = totalVideos === 0 ? 0 : (completedVideos / totalVideos) * 100;

    const summaryCard = document.createElement('div');
    summaryCard.className = "bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-2";
    summaryCard.innerHTML = `
      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
        <div>
          <h2 class="text-xl font-bold text-slate-800">Section Progress</h2>
          <p class="text-sm text-slate-500 mt-1">Track your learning and complete all videos below.</p>
        </div>
        <div class="text-left sm:text-right">
          <div class="text-2xl font-bold text-slate-800">
            <span id="completed-count" class="text-green-600">${completedVideos}</span>
            <span class="text-slate-300 text-lg mx-1">/</span>
            <span id="total-count" class="text-slate-500">${totalVideos}</span>
          </div>
          <div class="text-xs font-bold text-slate-400 uppercase tracking-wider mt-1">Videos Completed</div>
        </div>
      </div>
      <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
        <div id="summary-progress-bar" class="bg-green-500 h-2 rounded-full transition-all duration-700 ease-out" style="width: ${progressPercentage}%"></div>
      </div>
    `;
    container.appendChild(summaryCard);

    const gridContainer = document.createElement('div');
    gridContainer.className = "grid grid-cols-1 md:grid-cols-2 gap-6";
    container.appendChild(gridContainer);

    let modal = document.getElementById('video-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'video-modal';
      modal.className = "fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm hidden opacity-0 transition-opacity duration-300";

      modal.innerHTML = `
        <div class="relative w-full max-w-6xl p-4 mx-auto flex items-center justify-center min-h-screen">
          <div class="relative w-full max-h-[85vh] aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-slate-700">
            <button id="close-modal" class="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/90 text-white hover:text-red-400 p-2 sm:px-4 sm:py-2 rounded-lg flex items-center gap-2 backdrop-blur-md transition-all group cursor-pointer border border-white/20 shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" class="w-6 h-6 group-hover:rotate-90 transition-transform">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span class="font-medium text-base tracking-wide hidden sm:block">Close</span>
            </button>
            <video id="modal-video-player" controls controlsList="nodownload" preload="none" class="w-full h-full object-contain">
              Your browser does not support the video tag.
            </video>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      document.getElementById('close-modal').addEventListener('click', closeVideoModal);
    }

    categoryVideos.forEach(video => {
      const fullVideoUrl = video.video_url;
      const thumbnailUrl = video.thumbnail_url;

      const pathParts = video.blob_name.replace(/\\/g, '/').split('/');
      const rawFileName = pathParts[pathParts.length - 1] || video.title;
      const formattedTitle = rawFileName
        .replace(/\.mp4$/i, '')
        .replace(/^\d+\s*(?:[-.)]\s*|\s+)/, '')
        .trim();
      const trackName = pathParts[0].toLowerCase();
      const sequenceMatch = rawFileName.match(/^(\d+)/);
      const sequence = sequenceMatch ? Number(sequenceMatch[1]) : null;
      const displayTitle = trackVideoTitles[trackName]?.[sequence - 1] || formattedTitle;

      const isCompleted = localStorage.getItem('completed_' + video.blob_name) === 'true';

      const badgeBg = isCompleted ? 'bg-green-50' : 'bg-slate-50';
      const badgeBorder = isCompleted ? 'border-green-300' : 'border-slate-200';
      const badgeTextClass = isCompleted ? 'text-green-700' : 'text-slate-600';
      const badgeText = isCompleted ? 'Completed' : 'Mark Done';
      const cardOpacity = isCompleted ? 'opacity-60' : 'opacity-100';

      const videoCard = document.createElement('div');
      videoCard.className = `video-card-container group flex flex-col border border-slate-200 rounded-xl bg-white shadow-sm hover:shadow-glow transition-all duration-500 overflow-hidden ${cardOpacity}`;

      const thumbnailHTML = thumbnailUrl ? `
        <img src="${thumbnailUrl}" alt="${displayTitle}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.style.display='none'; this.nextElementSibling.classList.remove('hidden');" />
      ` : '';

      videoCard.innerHTML = `
        <div class="relative w-full aspect-video bg-slate-900 cursor-pointer overflow-hidden flex items-center justify-center" onclick="openVideoModal('${fullVideoUrl}')">
          ${thumbnailHTML}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-10 h-10 text-white ml-1">
              <path fill-rule="evenodd" d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z" clip-rule="evenodd" />
            </svg>
          </div>
        </div>
 
        <div class="p-5 flex-1 flex flex-col">
          <div class="flex justify-between items-start gap-4 mb-2">
            <strong class="text-lg text-slate-800 line-clamp-2" title="${displayTitle}">${displayTitle}</strong>
            <label class="flex items-center gap-2 cursor-pointer ${badgeBg} hover:bg-slate-100 border ${badgeBorder} px-3 py-1 rounded-full transition-colors flex-shrink-0">
              <input type="checkbox"
                class="w-4 h-4 text-green-600 rounded border-slate-300 focus:ring-green-500 cursor-pointer"
                data-videoid="${video.blob_name}"
                onchange="toggleVideoCompletion(this)"
                ${isCompleted ? 'checked' : ''}>
              <span class="text-xs font-semibold ${badgeTextClass} select-none whitespace-nowrap">
                ${badgeText}
              </span>
            </label>
          </div>
          <p class="text-sm text-slate-600 mt-2 line-clamp-2 flex-1">
            ${video.description || ''}
          </p>
        </div>
      `;

      gridContainer.appendChild(videoCard);
    });

  } catch (error) {
    console.error("Error fetching videos:", error);
    document.getElementById(containerId).innerHTML = '<p class="text-red-500">Failed to load video lessons.</p>';
  }
}

window.openVideoModal = function (videoUrl) {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('modal-video-player');
  player.src = videoUrl;
  modal.classList.remove('hidden');
  setTimeout(() => {
    modal.classList.remove('opacity-0');
    modal.classList.add('opacity-100');
    player.play().catch(() => console.log("Auto-play prevented"));
  }, 10);
};

window.closeVideoModal = function () {
  const modal = document.getElementById('video-modal');
  const player = document.getElementById('modal-video-player');
  modal.classList.remove('opacity-100');
  modal.classList.add('opacity-0');

  player.pause();
  player.removeAttribute('src'); // Forcibly kills the active Azure download stream
  player.load();

  setTimeout(() => {
    modal.classList.add('hidden');
  }, 300);
};

window.toggleVideoCompletion = function (checkbox) {
  const videoId = checkbox.dataset.videoid;
  const textSpan = checkbox.nextElementSibling;
  const labelParent = checkbox.parentElement;
  const card = checkbox.closest('.video-card-container');

  const countDisplay = document.getElementById('completed-count');
  const totalDisplay = document.getElementById('total-count');
  const masterProgressBar = document.getElementById('summary-progress-bar');

  let currentCompleted = parseInt(countDisplay.textContent);
  const totalVideos = parseInt(totalDisplay.textContent);

  if (checkbox.checked) {
    localStorage.setItem('completed_' + videoId, 'true');
    textSpan.textContent = 'Completed';
    textSpan.classList.replace('text-slate-600', 'text-green-700');
    labelParent.classList.replace('bg-slate-50', 'bg-green-50');
    labelParent.classList.replace('border-slate-200', 'border-green-300');
    card.classList.replace('opacity-100', 'opacity-60');
    currentCompleted++;
  } else {
    localStorage.removeItem('completed_' + videoId);
    textSpan.textContent = 'Mark Done';
    textSpan.classList.replace('text-green-700', 'text-slate-600');
    labelParent.classList.replace('bg-green-50', 'bg-slate-50');
    labelParent.classList.replace('border-green-300', 'border-slate-200');
    card.classList.replace('opacity-60', 'opacity-100');
    currentCompleted--;
  }

  countDisplay.textContent = currentCompleted;
  const newPercentage = totalVideos === 0 ? 0 : (currentCompleted / totalVideos) * 100;
  masterProgressBar.style.width = `${newPercentage}%`;
};