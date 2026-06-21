'use strict';

const QuotesProviders = (() => {
  const CACHE_TTL = 43200000; // 12 hours
  const CACHE_VERSION = 2; // bump to invalidate old-format caches

  const FALLBACK_QUOTES = [
    { text: 'The only way to do great work is to love what you do.', author: 'Steve Jobs' },
    { text: 'Life is what happens when you\'re busy making other plans.', author: 'John Lennon' },
    { text: 'In the end, we only regret the chances we didn\'t take.', author: 'Lewis Carroll' },
    { text: 'The best time to plant a tree was 20 years ago. The second best time is now.', author: 'Chinese Proverb' },
    { text: 'It does not matter how slowly you go as long as you do not stop.', author: 'Confucius' },
    { text: 'Everything you\'ve ever wanted is on the other side of fear.', author: 'George Addair' },
    { text: 'Success is not final, failure is not fatal: it is the courage to continue that counts.', author: 'Winston Churchill' },
    { text: 'Believe you can and you\'re halfway there.', author: 'Theodore Roosevelt' },
    { text: 'The future belongs to those who believe in the beauty of their dreams.', author: 'Eleanor Roosevelt' },
    { text: 'Happiness is not something ready made. It comes from your own actions.', author: 'Dalai Lama' },
    { text: 'What we think, we become.', author: 'Buddha' },
    { text: 'Simplicity is the ultimate sophistication.', author: 'Leonardo da Vinci' },
    { text: 'The only true wisdom is in knowing you know nothing.', author: 'Socrates' },
    { text: 'Imagination is more important than knowledge.', author: 'Albert Einstein' },
    { text: 'Do not dwell in the past, do not dream of the future, concentrate the mind on the present moment.', author: 'Buddha' },
    { text: 'We are what we repeatedly do. Excellence, then, is not an act, but a habit.', author: 'Aristotle' },
    { text: 'The unexamined life is not worth living.', author: 'Socrates' },
    { text: 'Act as if what you do makes a difference. It does.', author: 'William James' },
    { text: 'Keep your face always toward the sunshine, and shadows will fall behind you.', author: 'Walt Whitman' },
    { text: 'It is during our darkest moments that we must focus to see the light.', author: 'Aristotle' },
    { text: 'The purpose of our lives is to be happy.', author: 'Dalai Lama' },
    { text: 'Not how long, but how well you have lived is the main thing.', author: 'Seneca' },
    { text: 'If life were predictable it would cease to be life, and be without flavor.', author: 'Eleanor Roosevelt' },
    { text: 'The whole secret of a successful life is to find out what is one\'s destiny to do, and then do it.', author: 'Henry Ford' },
    { text: 'Curiosity about life in all of its aspects is the secret of great creative people.', author: 'Leo Burnett' },
    { text: 'The most difficult thing is the decision to act. The rest is merely tenacity.', author: 'Amelia Earhart' },
    { text: 'Every strike brings me closer to the next home run.', author: 'Babe Ruth' },
    { text: 'Definiteness of purpose is the starting point of all achievement.', author: 'W. Clement Stone' },
    { text: 'Life is trying things to see if they work.', author: 'Ray Bradbury' },
    { text: 'The secret of getting ahead is getting started.', author: 'Mark Twain' },
    { text: 'Wherever you go, go with all your heart.', author: 'Confucius' },
    { text: 'The mind is everything. What you think you become.', author: 'Buddha' },
    { text: 'An unexamined life is not worth living.', author: 'Socrates' },
    { text: 'We know what we are, but know not what we may be.', author: 'William Shakespeare' },
    { text: 'The best revenge is massive success.', author: 'Frank Sinatra' },
    { text: 'I have no special talent. I am only passionately curious.', author: 'Albert Einstein' },
    { text: 'Be yourself; everyone else is already taken.', author: 'Oscar Wilde' },
    { text: 'Two things are infinite: the universe and human stupidity; and I\'m not sure about the universe.', author: 'Albert Einstein' },
    { text: 'So many books, so little time.', author: 'Frank Zappa' },
    { text: 'A room without books is like a body without a soul.', author: 'Marcus Tullius Cicero' },
    { text: 'You only live once, but if you do it right, once is enough.', author: 'Mae West' },
    { text: 'Be the change that you wish to see in the world.', author: 'Mahatma Gandhi' },
    { text: 'If you tell the truth, you don\'t have to remember anything.', author: 'Mark Twain' },
    { text: 'Without music, life would be a mistake.', author: 'Friedrich Nietzsche' },
    { text: 'A person who never made a mistake never tried anything new.', author: 'Albert Einstein' },
    { text: 'It is our choices that show what we truly are, far more than our abilities.', author: 'J.K. Rowling' },
    { text: 'Do or do not. There is no try.', author: 'Yoda' },
    { text: 'Time you enjoy wasting is not wasted time.', author: 'Marthe Troly-Curtin' },
    { text: 'The journey of a thousand miles begins with one step.', author: 'Lao Tzu' },
    { text: 'That which does not kill us makes us stronger.', author: 'Friedrich Nietzsche' }
  ];

  function _pickFallback() {
    return FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
  }

  async function fetchQuote(lang) {
    // Try Zenquotes API first
    try {
      const response = await fetch('https://zenquotes.io/api/random');
      if (!response.ok) throw new Error('Status ' + response.status);
      const data = await response.json();
      if (data && data.length > 0 && data[0].q) {
        let quoteText = data[0].q;
        const quoteAuthor = data[0].a || '';

        if (lang !== 'en') {
          const translated = await translateQuote(quoteText, lang);
          if (translated) {
            quoteText = translated;
          }
        }

        return { text: quoteText, author: quoteAuthor, lang: lang };
      }
    } catch (e) {
      // Fall through to fallback
    }

    // Fallback: pick from built-in array
    const fallback = _pickFallback();
    let quoteText = fallback.text;
    const quoteAuthor = fallback.author;

    if (lang !== 'en') {
      const translated = await translateQuote(quoteText, lang);
      if (translated) {
        quoteText = translated;
      }
    }

    return { text: quoteText, author: quoteAuthor, lang: lang };
  }

  function _langToGoogle(code) {
    if (code === 'zh_CN') return 'zh-CN';
    return code;
  }

  async function translateQuote(text, targetLang) {
    try {
      const tl = _langToGoogle(targetLang);
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${tl}&dt=t&q=${encodeURIComponent(text)}`;
      const response = await fetch(url);
      if (!response.ok) return null;
      const data = await response.json();
      if (data && data[0] && data[0][0] && data[0][0][0]) {
        return data[0][0][0];
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  return { fetchQuote, translateQuote, CACHE_TTL, CACHE_VERSION };
})();
