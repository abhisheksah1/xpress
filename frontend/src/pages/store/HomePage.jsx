export default function HomePage() {
  return (
    <div>
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-24">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Send Love Across Nepal</h1>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Curated gifts delivered to every corner of Nepal. Perfect for birthdays, festivals, and special moments.
          </p>
          <a href="/shop" className="inline-block bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition-colors">
            Shop Gifts
          </a>
        </div>
      </section>
      <section className="max-w-7xl mx-auto px-4 py-16">
        <h2 className="text-2xl font-bold text-center mb-8">Why KoseliXpress?</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            { title: 'Nationwide Delivery', desc: 'We deliver gifts across all 7 provinces of Nepal.' },
            { title: 'Gift Wrapping', desc: 'Beautiful gift wrapping with personalized messages.' },
            { title: 'Secure Payments', desc: 'Pay via Khalti, eSewa, Fonepay, or card.' },
          ].map((item) => (
            <div key={item.title} className="card text-center">
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
