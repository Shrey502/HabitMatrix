import re

def classify_task_category(title: str) -> str:
    title_lower = title.lower()
    
    # 1. Development keywords
    dev_keywords = {
        'code', 'coding', 'program', 'programming', 'bug', 'debug', 'typescript', 'javascript', 'python', 
        'rust', 'golang', 'java', 'c++', 'c#', 'compiler', 'database', 'sql', 'mongodb', 'git', 'github', 
        'gitlab', 'deploy', 'deployment', 'ci/cd', 'frontend', 'backend', 'api', 'docker', 'kubernetes', 
        'dev', 'build', 'hackathon', 'hack', 'software', 'pull request', 'merge', 'jira', 'trello', 'hackerrank',
        'leetcode', 'stack overflow', 'ui', 'ux', 'figma', 'node', 'npm', 'yarn', 'pnpm', 'webpack', 'vite', 
        'turbo', 'nextjs', 'react', 'angular', 'vue', 'svelte', 'html', 'css', 'sass', 'tailwind', 'bootstrap', 
        'flexbox', 'grid', 'dom', 'json', 'xml', 'yaml', 'markdown', 'server', 'client', 'host', 'hosting', 
        'cloud', 'aws', 'azure', 'gcp', 'vercel', 'netlify', 'heroku', 'lambda', 'serverless', 'microservice', 
        'rest', 'graphql', 'websocket', 'oauth', 'auth', 'jwt', 'security', 'encrypt', 'decrypt', 'hash', 
        'cipher', 'cyber', 'firewall', 'ssl', 'dns', 'port', 'proxy', 'reverse proxy', 'nginx', 'apache', 
        'load balancer', 'redis', 'postgres', 'postgresql', 'mysql', 'sqlite', 'prisma', 'mongoose', 'orm', 
        'query', 'index', 'join', 'transaction', 'schema', 'migration', 'seed', 'seeding', 'test', 'testing', 
        'jest', 'cypress', 'playwright', 'selenium', 'mocha', 'chai', 'unit test', 'integration test', 'mock', 
        'stub', 'spy', 'lint', 'linter', 'eslint', 'prettier', 'compile', 'transpiler', 'babel', 'tsconfig', 
        'package', 'dependency', 'module', 'import', 'export', 'require', 'script', 'scripts', 'terminal', 
        'bash', 'shell', 'powershell', 'cmd', 'cli', 'ssh', 'ftp', 'sftp', 'ip', 'tcp', 'udp', 'http', 'https', 
        'socket', 'framework', 'library', 'sdk', 'api gateway', 'logging', 'logger', 'monitor', 'monitoring', 
        'datadog', 'sentry', 'logrocket', 'devops', 'agile', 'scrum', 'sprint', 'backlog', 'kanban', 'ticket', 
        'tickets', 'issue', 'issues', 'milestone', 'release', 'semver', 'refactor', 'refactoring', 'docs',
        'readme', 'comment', 'comments', 'stack', 'heap', 'pointer', 'memory', 'leak', 'buffer', 'stackoverflow', 
        'algorithm', 'algorithms', 'big-o', 'sorting', 'search', 'tree', 'graph', 'queue', 'list', 'array', 
        'hashmap', 'dictionary', 'set', 'tuple', 'class', 'object', 'instance', 'interface', 'abstract', 
        'inheritance', 'polymorphism', 'encapsulation', 'static', 'final', 'const', 'let', 'var', 'function', 
        'method', 'async', 'await', 'promise', 'callback', 'loop', 'conditional', 'recursion', 'thread', 
        'process', 'concurrency', 'parallel', 'lock', 'mutex', 'semaphore', 'event loop', 'call stack', 'regex', 
        'pipelines', 'staging', 'production', 'hotfix', 'patch', 'repository', 'branch', 'commit', 'push', 
        'pull', 'clone', 'init', 'status', 'diff', 'stash', 'rebase', 'cherry-pick'
    }
    
    # 2. Health keywords
    health_keywords = {
        'gym', 'workout', 'run', 'running', 'jog', 'jogging', 'exercise', 'stretching', 'stretch', 
        'yoga', 'water', 'sleep', 'diet', 'meal', 'walk', 'walking', 'cardio', 'lift', 'lifting', 
        'doctor', 'dentist', 'medicine', 'meds', 'vitamin', 'vitamins', 'calories', 'healthy', 'protein',
        'fruit', 'vegetable', 'hydrate', 'hydration', 'fitness', 'dumbbells', 'barbells', 'kettlebell', 
        'pilates', 'crossfit', 'calisthenics', 'pushup', 'pullup', 'squat', 'lunge', 'plank', 'bench press', 
        'deadlift', 'hiit', 'warmup', 'cooldown', 'treadmill', 'elliptical', 'bicycle', 'cycling', 'swim', 
        'swimming', 'hike', 'hiking', 'climb', 'climbing', 'boxing', 'martial arts', 'karate', 'judo', 
        'taekwondo', 'bjj', 'wrestling', 'sports', 'soccer', 'football', 'basketball', 'tennis', 'badminton', 
        'volleyball', 'golf', 'baseball', 'rugby', 'cricket', 'squash', 'marathon', 'sprint', 'nutrition', 
        'carbs', 'fats', 'fiber', 'sodium', 'sugar', 'supplement', 'creatine', 'whey', 'bcaa', 'amino acids', 
        'electrolytes', 'mineral', 'calcium', 'iron', 'magnesium', 'zinc', 'potassium', 'omega3', 'fish oil', 
        'chiropractor', 'massage', 'physio', 'physiotherapy', 'rehabilitation', 'injury', 'recovery', 'sore', 
        'muscle', 'joint', 'bone', 'heart', 'lungs', 'blood pressure', 'cholesterol', 'pulse', 'heart rate', 
        'bpm', 'rest day', 'sleep hygiene', 'rem', 'deep sleep', 'circadian rhythm', 'nap', 'counselor', 
        'checkup', 'blood test', 'screening', 'vaccine', 'allergy', 'asthma', 'cold', 'flu', 'fever', 'cough', 
        'prescription', 'pharmacist', 'herbal', 'tea', 'green tea', 'steps', 'step tracker', 'pedometer', 
        'calorie burn', 'active', 'lifestyle', 'wellness', 'spa', 'sauna', 'steam room', 'cold plunge', 
        'ice bath', 'hot tub', 'flexibility', 'mobility', 'core', 'abs', 'biceps', 'triceps', 'chest', 
        'back', 'shoulders', 'legs', 'calves', 'glutes', 'hamstrings', 'quads', 'forearm', 'neck', 'spine', 
        'posture', 'physical therapy', 'ergonomics', 'nutrition label', 'organic', 'whole foods', 'vegan', 
        'vegetarian', 'keto', 'paleo', 'fasting', 'breakfast', 'lunch', 'dinner', 'snack', 'healthy fats', 
        'avocado', 'nuts', 'seeds', 'chicken', 'fish', 'beef', 'tofu', 'eggs', 'spinach', 'broccoli', 'kale', 
        'apple', 'banana', 'berries', 'orange', 'water intake', 'fitbit', 'apple watch', 'garmin', 'strava'
    }
    
    # 3. Mindset keywords
    mindset_keywords = {
        'meditate', 'meditation', 'read', 'reading', 'journal', 'journaling', 'diary', 'gratitude', 
        'pray', 'prayer', 'reflect', 'reflection', 'breathing', 'focus', 'book', 'learn', 'learning', 
        'study', 'studying', 'course', 'class', 'lecture', 'mindful', 'mindfulness', 'therapy', 'podcast',
        'duolingo', 'brain', 'relax', 'visualize', 'dream', 'dreams', 'goal', 'goals', 'target', 'targets', 
        'vision', 'board', 'future', 'plan', 'planning', 'brainstorm', 'brainstorming', 'write', 'writing', 
        'poetry', 'essay', 'novel', 'article', 'medium', 'blog', 'newsletter', 'language', 'vocabulary', 
        'flashcards', 'anki', 'memo', 'memory', 'recall', 'review', 'spacing', 'active recall', 'feynman', 
        'tutor', 'tutoring', 'teach', 'teaching', 'mentor', 'mentoring', 'coach', 'coaching', 'psychiatrist', 
        'psychology', 'philosophy', 'stoicism', 'stoic', 'aurelius', 'seneca', 'epictetus', 'buddhism', 'zen', 
        'taoism', 'wisdom', 'quote', 'quotes', 'inspiration', 'inspire', 'motivate', 'motivation', 'self-help', 
        'growth', 'mindset', 'fixed mindset', 'growth mindset', 'brain health', 'cognitive', 'logic', 'puzzle', 
        'sudoku', 'chess', 'crosswords', 'riddles', 'math', 'science', 'history', 'geography', 'arts', 'music', 
        'instrument', 'guitar', 'piano', 'violin', 'drums', 'practice', 'practicing', 'sketch', 'draw', 
        'drawing', 'paint', 'painting', 'sculpt', 'sculpting', 'craft', 'crafting', 'origami', 'knit', 
        'knitting', 'crochet', 'sew', 'sewing', 'wood', 'woodwork', 'pottery', 'photo', 'photography', 
        'video', 'videography', 'edit', 'editing', 'creative', 'creativity', 'imagination', 'design', 'think', 
        'thinking', 'analysis', 'analyze', 'problem solving', 'critical thinking', 'strategy', 'strategic', 
        'decision making', 'prioritize', 'time management', 'productivity', 'focus time', 'deep work', 'cal newport', 
        'flow', 'flow state', 'presence', 'conscious', 'consciousness', 'awareness', 'self-aware', 'feedback', 
        'constructive', 'listen', 'listening', 'active listening', 'empathy', 'compassionate', 'kindness', 
        'volunteer', 'volunteering', 'charity', 'donate', 'donation', 'manifest', 'manifestation', 'affirmation', 
        'affirmations', 'belief', 'believe', 'confidence', 'self-esteem', 'self-love', 'self-care', 'acupuncture', 
        'pranayama', 'wim hof', 'yoga nidra', 'sleep hypnosis', 'biofeedback', 'neurofeedback', 'test prep', 
        'exam', 'exams', 'quiz', 'quizzes', 'certification', 'certificate', 'diploma', 'degree', 'university', 
        'college', 'school', 'student', 'study guide', 'syllabus', 'homework', 'assignment', 'paper', 'thesis', 
        'dissertation', 'research', 'bibliography', 'citation', 'library', 'book club', 'non-fiction', 
        'fiction', 'textbook', 'audio book', 'audible', 'kindle', 'e-reader'
    }
    
    # 4. Routine keywords
    routine_keywords = {
        'clean', 'cleaning', 'wash', 'washing', 'laundry', 'dishes', 'buy', 'grocery', 'groceries', 
        'shop', 'shopping', 'mail', 'email', 'emails', 'call', 'calls', 'meeting', 'meet', 'breakfast', 
        'lunch', 'dinner', 'teeth', 'shower', 'brush', 'commute', 'commuting', 'chores', 'chore', 
        'bank', 'bill', 'bills', 'rent', 'garbage', 'trash', 'cook', 'cooking', 'tidy', 'sweep',
        'dust', 'ironing', 'schedule', 'organize', 'pay', 'taxes', 'tax', 'finance', 'budget', 
        'budgeting', 'money', 'wallet', 'bank account', 'transfer', 'savings', 'credit card', 'debit card', 
        'investment', 'stock', 'portfolio', 'crypto', 'bitcoin', 'insurance', 'receipt', 'receipts', 
        'invoice', 'contract', 'lease', 'document', 'documents', 'filing', 'file', 'folder', 'paper', 
        'post', 'package', 'delivery', 'amazon', 'ups', 'fedex', 'usps', 'courier', 'pickup', 'dropoff', 
        'return', 'refund', 'support', 'customer service', 'subscription', 'renew', 'cancel', 'membership', 
        'streaming', 'netflix', 'spotify', 'utilities', 'water bill', 'gas bill', 'electric bill', 
        'internet bill', 'phone bill', 'trash day', 'recycling', 'recycle', 'compost', 'mop', 'vacuum', 
        'wipe', 'sanitize', 'bleach', 'detergent', 'fabric softener', 'dryer sheets', 'folding', 'iron', 
        'steam', 'closet', 'wardrobe', 'clothes', 'hanger', 'hangers', 'shoes', 'shoe polish', 'bag', 
        'backpack', 'keys', 'keychain', 'lock', 'unlock', 'door', 'window', 'alarm', 'security system', 
        'smoke detector', 'battery', 'bulb', 'light', 'repair', 'fix', 'maintenance', 'plumber', 
        'electrician', 'mechanic', 'car', 'auto', 'vehicle', 'tire', 'oil change', 'gas', 'petrol', 
        'fuel', 'electric vehicle', 'ev', 'charger', 'charge', 'charging', 'train', 'bus', 'subway', 
        'metro', 'pass', 'transit', 'traffic', 'route', 'map', 'gps', 'navigation', 'calendar', 
        'invite', 'rsvp', 'event', 'appointment', 'appt', 'dentist appointment', 'doctor appointment', 
        'haircut', 'salon', 'nails', 'groom', 'grooming', 'shave', 'shaving', 'makeup', 'cosmetics', 
        'skin', 'skincare', 'moisturizer', 'sunscreen', 'perfume', 'cologne', 'deodorant', 'toothbrush', 
        'toothpaste', 'floss', 'mouthwash', 'soap', 'shampoo', 'conditioner', 'towel', 'bath', 'tub', 
        'sink', 'toilet', 'toilet paper', 'plunger', 'hand soap', 'hand sanitizer', 'mask', 'gloves', 
        'first aid', 'bandaid', 'ointment', 'medicine cabinet', 'declutter', 'sell', 'garage sale', 
        'thrift', 'donate clothes'
    }
    
    words = re.findall(r'\b\w+\b', title_lower)
    
    scores = {
        'Development': 0,
        'Health': 0,
        'Mindset': 0,
        'Routine': 0
    }
    
    for word in words:
        if word in dev_keywords:
            scores['Development'] += 2
        if word in health_keywords:
            scores['Health'] += 2
        if word in mindset_keywords:
            scores['Mindset'] += 2
        if word in routine_keywords:
            scores['Routine'] += 2
            
    # Substring matching for phrases/multi-word stems
    for key in dev_keywords:
        if len(key) > 3 and key in title_lower:
            scores['Development'] += 1
    for key in health_keywords:
        if len(key) > 3 and key in title_lower:
            scores['Health'] += 1
    for key in mindset_keywords:
        if len(key) > 3 and key in title_lower:
            scores['Mindset'] += 1
    for key in routine_keywords:
        if len(key) > 3 and key in title_lower:
            scores['Routine'] += 1
            
    # Find category with max score
    max_score = 0
    best_category = 'Others'
    for cat, score in scores.items():
        if score > max_score:
            max_score = score
            best_category = cat
            
    return best_category
