const CACHE_NAME = "border-warehouse-v1";

// 安装：跳过预缓存，运行时按需缓存
self.addEventListener("install", () => {
    self.skipWaiting();
});

// 激活：清理旧版本缓存
self.addEventListener("activate", (e) => {
    e.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
            )
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", (e) => {
    // 只处理 GET 请求
    if (e.request.method !== "GET") return;

    const url = new URL(e.request.url);

    // 只处理同源请求
    if (url.origin !== self.location.origin) return;

    // GLB 模型：缓存优先
    if (url.pathname.endsWith(".glb")) {
        e.respondWith(
            caches.match(e.request).then((cached) => {
                if (cached) return cached;
                return fetch(e.request).then((res) => {
                    if (res.ok) {
                        const clone = res.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
                    }
                    return res;
                });
            })
        );
        return;
    }

    // 其他所有文件：网络优先，失败回退缓存，成功则更新缓存
    e.respondWith(
        fetch(e.request)
        .then((res) => {
            if (res.ok) {
                const clone = res.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
            }
            return res;
        })
        .catch(() => caches.match(e.request))
    );
});
