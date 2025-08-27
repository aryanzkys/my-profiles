import { motion } from 'framer-motion';
import { useState } from 'react';
import { Mail, Linkedin, Instagram, Github, Copy, Check, Link as LinkIcon } from 'lucide-react';

const links = [
  {
    key: 'email',
    label: 'Email',
    href: 'mailto:prayogoaryan63@gmail.com',
    text: 'prayogoaryan63@gmail.com',
    icon: Mail,
    copyText: 'prayogoaryan63@gmail.com',
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/aryan-zaky-prayogo-a24164365/',
    text: 'linkedin.com/in/aryan-zaky-prayogo-a24164365/',
    icon: Linkedin,
    copyText: 'aryan-zaky-prayogo-a24164365',
  },
  {
    key: 'instagram',
    label: 'Instagram',
    href: 'https://instagram.com/aryanzkys',
    text: '@aryanzkys',
    icon: Instagram,
    copyText: 'aryanzkys',
  },
  {
    key: 'github',
    label: 'GitHub',
    href: 'https://github.com/aryanzkys',
    text: 'github.com/aryanzkys',
    icon: Github,
    copyText: 'aryanzkys',
  },
  {
    key: 'x',
    label: 'X',
    href: '#',
    text: 'on development',
    icon: LinkIcon,
    copyText: '',
    disabled: true,
  },
];

export default function Contact() {
  const [copied, setCopied] = useState('');

  const onCopy = async (text, key) => {
    try {
      if (!text) return;
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(''), 1500);
    } catch (e) {
      // noop
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="w-full max-w-3xl"
    >
      <h2 className="text-2xl md:text-3xl font-semibold text-cyan-300 mb-4 tracking-wide">Contact</h2>
      <div className="bg-black/35 border border-white/10 rounded-2xl p-4 md:p-6 backdrop-blur-md">
        <ul className="text-gray-200 divide-y divide-white/10">
          {links.map((item) => {
            const Icon = item.icon;
            const isHttp = item.href.startsWith('http');
            return (
              <li key={item.key} className="py-3">
                <div className="flex items-center justify-between gap-3">
                  <a
                    href={item.href}
                    target={isHttp ? '_blank' : undefined}
                    rel={isHttp ? 'noreferrer' : undefined}
                    className="flex items-center gap-2 group"
                  >
                    <Icon className="h-4 w-4 text-cyan-300/80 group-hover:text-cyan-200 transition-colors" />
                    <span className="text-sm md:text-base text-gray-300 group-hover:text-white transition-colors">
                      {item.label}
                    </span>
                  </a>

                  <div className="flex items-center gap-2 min-w-0">
                    <motion.span
                      whileHover={{ x: -2 }}
                      className="text-cyan-300 group-hover:text-cyan-200 text-sm md:text-base truncate max-w-[60vw] md:max-w-[28rem] text-right"
                      title={item.text}
                    >
                      {item.text}
                    </motion.span>
                    {item.copyText ? (
                      <button
                        onClick={() => onCopy(item.copyText, item.key)}
                        className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs border border-white/10 bg-white/5 hover:bg-white/10 text-gray-200 hover:text-white transition-colors"
                        aria-label={`Copy ${item.label}`}
                      >
                        {copied === item.key ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-cyan-300" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </button>
                    ) : (
                      <span className="sr-only">Copy disabled</span>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </motion.div>
  );
}
