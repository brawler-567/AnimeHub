const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4eHFtYWJjcmZmb3FlZ2R0ZnByIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjEzNDQ3NzcsImV4cCI6MjA3NjkyMDc3N30.0L8en_UyCCyDsqrQ6Ympt5ZsPDv3DujmYmaCbsZ5b0Y';

const ADMIN_PASSWORD = 'admin123';
let isAdmin = false;
let animeList = [];
let currentQuality = localStorage.getItem('videoQuality') || '720';
let supabase = null;

function initSupabase() {
    if (typeof supabase === 'undefined' || !window.supabase) {
        console.error('Supabase клиент не загружен! Проверьте подключение CDN.');
        alert('Ошибка: Supabase не загружен. Проверьте интернет-соединение.');
        return false;
    }
    
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase инициализирован успешно');
        return true;
    } catch (error) {
        console.error('Ошибка инициализации Supabase:', error);
        alert('Ошибка подключения к базе данных');
        return false;
    }
}

window.onload = function() {
    if (initSupabase()) {
        loadAnimeList();
        initQualitySelector();
    }
};

function initQualitySelector() {
    const qualitySelect = document.getElementById('qualitySelect');
    if (qualitySelect) {
        qualitySelect.value = currentQuality;
    }
}

function changeQuality() {
    const qualitySelect = document.getElementById('qualitySelect');
    currentQuality = qualitySelect.value;
    localStorage.setItem('videoQuality', currentQuality);
    
    const playerFrame = document.getElementById('playerFrame');
    if (playerFrame.src) {
        const currentSrc = playerFrame.src;
        playerFrame.src = currentSrc.split('&hd=')[0] + '&hd=' + currentQuality;
    }
}

function login() {
    const password = document.getElementById('passwordInput').value;
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('loginForm').classList.add('hidden');
        document.getElementById('adminButtons').classList.remove('hidden');
        document.getElementById('passwordInput').value = '';
        document.getElementById('emptyStateText').textContent = 'Нажмите "Добавить аниме" чтобы начать';
        renderAnimeGrid();
    } else {
        alert('Неверный пароль');
    }
}

function logout() {
    isAdmin = false;
    document.getElementById('loginForm').classList.remove('hidden');
    document.getElementById('adminButtons').classList.add('hidden');
    document.getElementById('addForm').classList.remove('active');
    document.getElementById('emptyStateText').textContent = 'Войдите как администратор, чтобы добавить аниме';
    renderAnimeGrid();
}

function toggleAddForm() {
    const form = document.getElementById('addForm');
    form.classList.toggle('active');
    if (!form.classList.contains('active')) {
        clearForm();
    }
}

function clearForm() {
    document.getElementById('animeTitle').value = '';
    document.getElementById('animeDescription').value = '';
    document.getElementById('animeVkUrl').value = '';
    document.getElementById('animeThumbnail').value = '';
}

function extractVkVideoId(url) {
    const match = url.match(/video(-?\d+)_(\d+)/);
    if (match) {
        return { oid: match[1], id: match[2] };
    }
    return null;
}

async function addAnime() {
    const title = document.getElementById('animeTitle').value.trim();
    const description = document.getElementById('animeDescription').value.trim();
    const vkUrl = document.getElementById('animeVkUrl').value.trim();
    const thumbnail = document.getElementById('animeThumbnail').value.trim();

    if (!title || !vkUrl) {
        alert('Заполните название и VK ссылку');
        return;
    }
const videoData = extractVkVideoId(vkUrl);
    if (!videoData) {
        alert('Неверный формат VK ссылки. Пример: https://vk.com/video-12345_67890');
        return;
    }

    const anime = {
        title: title,
        description: description,
        vk_url: vkUrl,
        thumbnail: thumbnail,
        video_oid: videoData.oid,
        video_id: videoData.id,
        created_at: new Date().toISOString()
    };

    try {
        const { data, error } = await supabase
            .from('anime')
            .insert([anime])
            .select();

        if (error) {
            console.error('Ошибка добавления:', error);
            alert('Ошибка при добавлении аниме: ' + error.message);
            return;
        }

        console.log('Аниме добавлено:', data);
        await loadAnimeList();
        clearForm();
        toggleAddForm();
        alert('Аниме успешно добавлено!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при добавлении');
    }
}

async function deleteAnime(id) {
    if (!confirm('Удалить это аниме?')) {
        return;
    }

    try {
        const { error } = await supabase
            .from('anime')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Ошибка удаления:', error);
            alert('Ошибка при удалении: ' + error.message);
            return;
        }

        console.log('Аниме удалено');
        await loadAnimeList();
        closePlayer();
        alert('Аниме успешно удалено!');
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при удалении');
    }
}

function playAnime(id) {
    const anime = animeList.find(function(a) {
        return a.id === id;
    });
    if (!anime) return;

    document.getElementById('playerTitle').textContent = anime.title;
    document.getElementById('playerDescription').textContent = anime.description || '';
    
    let videoUrl = 'https://vk.com/video_ext.php?oid=' + anime.video_oid + '&id=' + anime.video_id;
    videoUrl += '&hd=' + currentQuality;
    videoUrl += '&autoplay=1';
    videoUrl += '&js_api=1';
    
    document.getElementById('playerFrame').src = videoUrl;
    document.getElementById('videoPlayer').classList.add('active');
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closePlayer() {
    document.getElementById('videoPlayer').classList.remove('active');
    document.getElementById('playerFrame').src = '';
}

function createAnimeCard(anime) {
    const card = document.createElement('div');
    card.className = 'anime-card';
    card.onclick = function() {
        playAnime(anime.id);
    };

    const thumbnail = document.createElement('div');
    thumbnail.className = 'anime-thumbnail';

    if (anime.thumbnail) {
        const img = document.createElement('img');
        img.src = anime.thumbnail;
        img.alt = anime.title;
        img.loading = 'lazy';
        thumbnail.appendChild(img);
    } else {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '80');
        svg.setAttribute('height', '80');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('stroke-width', '2');
        const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
        polygon.setAttribute('points', '5 3 19 12 5 21 5 3');
        svg.appendChild(polygon);
        thumbnail.appendChild(svg);
    }

    const playIcon = document.createElement('div');
    playIcon.className = 'play-icon';
    const playIconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
playIconSvg.setAttribute('width', '30');
    playIconSvg.setAttribute('height', '30');
    playIconSvg.setAttribute('viewBox', '0 0 24 24');
    playIconSvg.setAttribute('fill', 'white');
    const playPolygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    playPolygon.setAttribute('points', '5 3 19 12 5 21 5 3');
    playIconSvg.appendChild(playPolygon);
    playIcon.appendChild(playIconSvg);
    thumbnail.appendChild(playIcon);

    const info = document.createElement('div');
    info.className = 'anime-info';

    const title = document.createElement('div');
    title.className = 'anime-title';
    title.textContent = anime.title;

    const desc = document.createElement('div');
    desc.className = 'anime-description';
    desc.textContent = anime.description || 'Без описания';

    info.appendChild(title);
    info.appendChild(desc);

    if (isAdmin) {
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'btn btn-danger';
        deleteBtn.style.marginTop = '10px';
        deleteBtn.style.fontSize = '12px';
        deleteBtn.style.padding = '6px 12px';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.onclick = function(e) {
            e.stopPropagation();
            deleteAnime(anime.id);
        };
        info.appendChild(deleteBtn);
    }

    card.appendChild(thumbnail);
    card.appendChild(info);

    return card;
}

function renderAnimeGrid() {
    const grid = document.getElementById('animeGrid');
    const emptyState = document.getElementById('emptyState');

    if (animeList.length === 0) {
        grid.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    grid.innerHTML = '';

    const fragment = document.createDocumentFragment();
    
    animeList.forEach(function(anime) {
        const card = createAnimeCard(anime);
        fragment.appendChild(card);
    });
    
    grid.appendChild(fragment);
}

async function loadAnimeList() {
    try {
        const { data, error } = await supabase
            .from('anime')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Ошибка загрузки:', error);
            alert('Ошибка загрузки данных: ' + error.message);
            return;
        }

        animeList = data || [];
        console.log('Загружено аниме:', animeList.length);
        renderAnimeGrid();
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Произошла ошибка при загрузке данных');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const passwordInput = document.getElementById('passwordInput');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
});