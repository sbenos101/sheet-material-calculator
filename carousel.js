<script>

const productsMap = {
    "sheet-materials": {
        "name": "Sheet Materials",
        "img": `<svg class="category-thumb" xmlns="http://www.w3.org/2000/svg" width="75" height="75" viewBox="0 0 400 400"> <circle cx="200" cy="200" r="180" fill="white"/> <g id="sawblade-spin" transform="translate(200,200) scale(2.5) translate(-301,-304)"> <path fill="#009845" d="M345.98,320.47l-3.74-3.85-.99-1.1c-.61-.74-.67-1.83-.09-2.65.5-.7,1.33-1.03,2.12-.91l1.36.32,6.79,2.01s-1.16-14.5-1.39-16.27c-.23-1.78-2-2.16-2-2.16l-5.17-1.46-1.41-.46c-.9-.34-1.5-1.25-1.41-2.25.08-.86.64-1.55,1.39-1.85l1.34-.4,6.88-1.66s-8.25-11.98-9.34-13.4c-1.09-1.42-2.82-.87-2.82-.87l-5.21,1.32-1.45.3c-.95.15-1.92-.33-2.34-1.25-.36-.78-.22-1.66.28-2.29l.95-1.01,5.13-4.88s-13.13-6.25-14.79-6.93c-1.65-.69-2.87.66-2.87.66l-3.85,3.74-1.1.99c-.74.61-1.83.67-2.65.09-.7-.5-1.03-1.33-.91-2.12l.32-1.36,2.01-6.79s-14.5,1.16-16.27,1.39c-1.77.23-2.16,2.01-2.16,2.01l-1.47,5.17-.46,1.41c-.34.9-1.25,1.5-2.25,1.41-.86-.08-1.55-.64-1.84-1.39l-.4-1.33-1.66-6.88s-11.98,8.25-13.4,9.34c-1.42,1.09-.87,2.82-.87,2.82l1.31,5.21.3,1.45c.15.95-.33,1.92-1.25,2.34-.78.36-1.66.22-2.29-.28l-1.01-.96-4.88-5.13s-6.25,13.14-6.93,14.79c-.69,1.65.66,2.87.66,2.87l3.74,3.85.99,1.1c.61.74.67,1.83.09,2.65-.5.7-1.33,1.03-2.12.9l-1.36-.32-6.79-2.01s1.16,14.5,1.39,16.27c.23,1.77,2.01,2.16,2.01,2.16l5.17,1.47,1.41.46c.9.34,1.5,1.25,1.41,2.25-.08.86-.64,1.55-1.39,1.85l-1.34.4-6.88,1.66s8.25,11.98,9.34,13.4c1.09,1.42,2.82.87,2.82.87l5.21-1.31,1.45-.3c.95-.16,1.92.33,2.34,1.25.36.78.22,1.66-.28,2.29l-.95,1.02-5.13,4.88s13.14,6.25,14.79,6.94c1.65.69,2.87-.66,2.87-.66l3.85-3.74,1.1-.99c.74-.61,1.83-.67,2.65-.09.7.5,1.03,1.33.9,2.12l-.32,1.36-2.01,6.79s14.5-1.16,16.27-1.39c1.77-.23,2.16-2.01,2.16-2.01l1.46-5.17.46-1.41c.34-.9,1.25-1.5,2.25-1.41.86.08,1.55.64,1.84,1.39l.4,1.34,1.66,6.88s11.98-8.25,13.4-9.34c1.42-1.09.87-2.82.87-2.82l-1.31-5.21-.3-1.45c-.15-.95.33-1.92,1.25-2.34.78-.36,1.66-.22,2.29.28l1.02.95,4.88,5.13s6.25-13.14,6.93-14.79c.69-1.65-.66-2.87-.66-2.87ZM301.06,320.09c-8.7,0-15.76-7.05-15.76-15.76s7.06-15.76,15.76-15.76,15.76,7.06,15.76,15.76-7.05,15.76-15.76,15.76Z"/> </g> </svg>`,
        "categories": [
            { "name": "Chipboard Flooring", "img": "/media/catalog/category/import/building-materials/sheet-materials/chipboard-flooring.jpg", "href": "/building-materials/sheet-materials/chipboard-flooring" },
            { "name": "MDF Sheet", "img": "/media/catalog/category/import/building-materials/sheet-materials/mdf.jpg", "href": "/building-materials/sheet-materials/mdf" },
            { "name": "Melamine Faced Chipboard", "img": "/media/catalog/category/import/building-materials/sheet-materials/melamine-faced-chipboard.jpg", "href": "/building-materials/sheet-materials/melamine-faced-chipboard" },
            { "name": "OSB 3 Board", "img": "/media/catalog/category/osb-3-sterling-board.jpg", "href": "/building-materials/sheet-materials/osb-3-board" },
            { "name": "Plywood Sheet", "img": "/media/catalog/category/import/building-materials/sheet-materials/plywood.jpg", "href": "/building-materials/sheet-materials/plywood" },
            { "name": "Circular Cordless Saws", "img": "/media/catalog/category/import/power-tools/power-tools/powered-saws/circular-and-trim-saws-cordless.jpg", "href": "/power-tools/power-tools/powered-saws/circular-and-trim-saws-cordless" }
        ]
    }
};

function initializeApp() {
    let materials = ["sheet-materials"];
    const carousels = [];
    const prevButtons = [];
    const nextButtons = [];
    const carouselContainers = [];
    const carouselIndexMap = {};

    materials = materials.filter(material => {
        const exists = productsMap[material] && document.getElementById(`${material}-carousel`);
        if (!exists) console.warn(`Carousel for ${material} not found or missing in productsMap`);
        return exists;
    });

    materials.forEach((material, index) => {
        const section = document.getElementById(`${material}-carousel`);
        if (!section) return;

        const carousel = section.querySelector('.carousel');
        const prevBtn = section.querySelector('.prevBtn');
        const nextBtn = section.querySelector('.nextBtn');
        const container = section.querySelector('.carousel-container');

        if (!carousel || !prevBtn || !nextBtn || !container) return;

        carousels.push(carousel);
        prevButtons.push(prevBtn);
        nextButtons.push(nextBtn);
        carouselContainers.push(container);
        carouselIndexMap[material] = 0;

        carousel.innerHTML = '';

        const category = productsMap[material];
        const uniqueProducts = category.categories.filter(
            (product, idx, self) => idx === self.findIndex(p => p.href === product.href)
        );

        uniqueProducts.forEach(product => {
            const item = document.createElement('div');
            item.className = 'carousel-item';
            item.innerHTML = `
<form class="carousel-item-content w-full">
    <img src="${product.img}" alt="${product.name}" title="${product.name}" class="carousel-item-image">
    <div class="carousel-item-details w-full">
        <div class="flex flex-row items-center gap-4 justify-start" style="padding: 8px; padding-left: 0px; min-height: 50px;">
            ${category.img}
            <strong>
                <p class="md:text-lg text-base" style="border-bottom: #009845 2px solid; padding-bottom:4px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; line-height: 1.4;">
                    ${product.name}
                </p>
            </strong>
        </div>
        <div class="md:mt-auto w-full pt-2 pb-2 flex z-50">
            <a href="${product.href}" class="py-2 w-full btn btn-primary justify-center text-sm rounded uppercase font-bold focus:border-primary focus:outline-none focus:ring-0 mr-auto" aria-label="SHOP NOW">
                                <svg width="23" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 328.8">
                                    <path style="fill:#fff" d="M387.61,142.63h-116.59l-27.11-61.22c3.52-3.46,4.83-8.84,2.9-13.69l-21.21-53.51c-5.22-11.89-17.75-17.11-26.2-12.32l-1.1-.44c-10.5-4.17-20.52,1.02-24.69,11.53l-21.21,53.5c-1.9,4.8-.64,10.1,2.77,13.55l-.26,.18-27.57,62.42H12.45c-.26,0-.52,0-.77,.02-6.5,.29-11.68,4.32-11.68,9.19v6.79c0,5.07,5.99,9.49,12.83,9.49h3.52l52.04,148.59c2.54,7.25,9.38,12.11,17.07,12.11h220.59c7.4,0,14.06-4.52,16.8-11.4l59.16-148.73h5.64c.29,0,.58,0,.86-.03,6.45-.39,11.49-5.17,11.49-10.02v-6.79c0-5.05-5.57-9.19-12.39-9.2Zm-122.93,60.13h-55.65v-34.72h61.02l-5.38,34.72Zm-7.75,50.05h-47.9v-32.17h52.88l-4.98,32.17Zm-119.42-32.17h53.04l-.06,32.17h-48.18l-4.81-32.17Zm33.86-132.76l.09-.5c5.78,1.02,11.72-2.13,13.97-7.79l13.92-35.1,14.41,36.34c2.13,5.36,7.57,8.47,13.06,7.91h0s.06,.17,.09,.28c0,.03,.02,.06,.02,.08,0,0,0,.02,0,.02l24.7,53.53h-104.82l24.55-54.76Zm19.28,80.16l-.06,34.72h-55.76l-5.2-34.72h61.01Zm-146.03,0H111.83l5.05,34.72H56.87l-12.25-34.72Zm19.4,52.6h55.46l4.69,32.17h-49.17l-10.98-32.17Zm29.87,84.25l-12.26-34.21h45.13l4.98,34.21h-37.84Zm56.22,0l-5.12-34.21h45.46l-.06,34.21h-40.28Zm58.91,0v-34.21h45.13l-5.3,34.21h-39.83Zm90.13,0h-32.17l5.39-34.21h39.54l-12.76,34.21Zm20.42-52.08h-44.38l5.08-32.17h52.59l-13.28,32.17Zm21.45-50.05h-57.94l5.47-34.72h66.76l-14.29,34.72Z"/>
                                </svg>
                                <span class="ml-2 inline text-nowrap">SHOP NOW</span></a>
        </div>
    </div>
</form>`;
            carousel.appendChild(item);
        });

        if (uniqueProducts.length <= 1) {
            prevBtn.classList.add('hidden');
            nextBtn.classList.add('hidden');
        }
    });

    function getVisibleItems() {
        if (window.innerWidth <= 500) return 1;
        if (window.innerWidth <= 1280) return 2;
        return 3;
    }

    function getMaxIndex(material) {
        const uniqueCount = productsMap[material].categories.filter(
            (product, idx, self) => idx === self.findIndex(p => p.href === product.href)
        ).length;
        return Math.max(uniqueCount - getVisibleItems(), 0);
    }

    function updateCarousel(material) {
        const idx = materials.indexOf(material);
        const carousel = carousels[idx];
        if (!carousel) return;
        const visibleItems = getVisibleItems();
        const maxIndex = getMaxIndex(material);
        carouselIndexMap[material] = Math.min(carouselIndexMap[material], maxIndex);
        const itemWidth = 100 / visibleItems;
        carousel.style.transform = `translateX(-${carouselIndexMap[material] * itemWidth}%)`;
    }

    function nextProduct(material) {
        const maxIndex = getMaxIndex(material);
        if (carouselIndexMap[material] < maxIndex) {
            carouselIndexMap[material]++;
            updateCarousel(material);
        }
    }

    function prevProduct(material) {
        if (carouselIndexMap[material] > 0) {
            carouselIndexMap[material]--;
            updateCarousel(material);
        }
    }

    materials.forEach((material, index) => {
        const prevBtn = prevButtons[index];
        const nextBtn = nextButtons[index];
        const carouselContainer = carouselContainers[index];

        if (prevBtn && nextBtn) {
            prevBtn.addEventListener('click', () => prevProduct(material));
            nextBtn.addEventListener('click', () => nextProduct(material));
        }

        if (carouselContainer) {
            let touchStartX = 0;
            let isSwiping = false;

            carouselContainer.addEventListener('touchstart', e => {
                touchStartX = e.touches[0].clientX;
                isSwiping = false;
            });
            carouselContainer.addEventListener('touchmove', e => {
                if (isSwiping) return;
                const touchMoveX = e.touches[0].clientX;
                const swipeDistance = touchStartX - touchMoveX;
                const swipeThreshold = window.innerWidth * 0.25;
                if (Math.abs(swipeDistance) > swipeThreshold) {
                    isSwiping = true;
                    swipeDistance > 0 ? nextProduct(material) : prevProduct(material);
                }
            });
            carouselContainer.addEventListener('touchend', () => { isSwiping = false; });
        }
    });

    function updateCarousels() {
        materials.forEach(material => updateCarousel(material));
    }

    window.addEventListener('resize', updateCarousels);
    updateCarousels();
}

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

</script>
