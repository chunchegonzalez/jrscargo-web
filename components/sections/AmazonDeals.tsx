import { ArrowRight, ShoppingBag, Laptop, Smartphone, Shirt } from 'lucide-react';
import { FaAmazon } from 'react-icons/fa';

const deals = [
  {
    title: 'Ofertas del Día',
    discount: 'Hasta 50% de descuento',
    icon: ShoppingBag,
    color: 'bg-orange-500',
    link: 'https://www.amazon.com/deals',
  },
  {
    title: 'Electrónica',
    discount: 'Lo más buscado',
    icon: Laptop,
    color: 'bg-blue-500',
    link: 'https://www.amazon.com/b?node=16225009011',
  },
  {
    title: 'Celulares',
    discount: 'Accesorios y más',
    icon: Smartphone,
    color: 'bg-purple-500',
    link: 'https://www.amazon.com/b?node=2335752011',
  },
  {
    title: 'Ropa y Zapatos',
    discount: 'Tendencias de moda',
    icon: Shirt,
    color: 'bg-pink-500',
    link: 'https://www.amazon.com/b?node=7141123011',
  },
];

export default function AmazonDeals() {
  return (
    <section className="py-12 bg-white relative border-b border-gray-100">
      <div className="container-max">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#FF9900]/10 rounded-full flex items-center justify-center text-[#FF9900]">
              <FaAmazon size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-brand-blue">Promociones en Amazon</h2>
              <p className="text-brand-text-gray text-sm">Aprovecha y trae tus compras con JRS Cargo</p>
            </div>
          </div>
          <a 
            href="https://www.amazon.com/deals" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-sm font-bold text-brand-blue hover:text-[#FF9900] flex items-center gap-2 transition-colors"
          >
            Ver todas las ofertas <ArrowRight size={16} />
          </a>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {deals.map((deal, index) => {
            const Icon = deal.icon;
            return (
              <a 
                key={index}
                href={deal.link}
                target="_blank"
                rel="noopener noreferrer"
                className="group relative bg-gray-50 hover:bg-white p-5 rounded-2xl border border-gray-100 hover:border-[#FF9900]/30 shadow-sm hover:shadow-md transition-all duration-300 flex items-center gap-4 overflow-hidden"
              >
                <div className={`w-12 h-12 ${deal.color} rounded-xl flex items-center justify-center text-white shadow-inner shrink-0 group-hover:scale-110 transition-transform`}>
                  <Icon size={20} />
                </div>
                <div className="relative z-10">
                  <h3 className="font-bold text-brand-blue group-hover:text-[#FF9900] transition-colors">{deal.title}</h3>
                  <p className="text-xs font-semibold text-brand-text-light">{deal.discount}</p>
                </div>
                {/* Decoration */}
                <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <FaAmazon size={64} />
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}
