const sharp = require('sharp');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs').promises;
const path = require('path');
const { ProfileImage } = require('../models');

class EnhancedImageRecognizer {
    constructor() {
        console.log('🚀 Enhanced Image Recognition System Initialized');
        this.cache = new Map();
        this.downloadStats = {
            successful: 0,
            failed: 0,
            totalAttempts: 0
        };

        // Cache configuration
        this.cacheConfig = {
            cacheDir: path.join(__dirname, '../../cache'),
            processedDataFile: path.join(__dirname, '../../cache/processed_data.json'),
            signaturesDir: path.join(__dirname, '../../cache/signatures'),
            metadataFile: path.join(__dirname, '../../cache/metadata.json')
        };
    }

    // Initialize cache directories
    async initializeCacheDirectories() {
        try {
            await fs.mkdir(this.cacheConfig.cacheDir, { recursive: true });
            await fs.mkdir(this.cacheConfig.signaturesDir, { recursive: true });
            console.log('📁 Cache directories initialized');
        } catch (error) {
            console.error('❌ Failed to create cache directories:', error.message);
        }
    }

    // Enhanced image download with retry logic
    async downloadImage(url, retries = 2) {
        this.downloadStats.totalAttempts++;

        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                console.log(`📥 Downloading image (attempt ${attempt + 1}): ${url.substring(0, 80)}...`);

                const response = await axios.get(url, {
                    responseType: 'arraybuffer',
                    timeout: 25000,
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
                        'Accept': 'image/webp,image/apng,image/*,*/*',
                        'Accept-Encoding': 'gzip, deflate, br',
                        'Cache-Control': 'no-cache'
                    },
                    maxRedirects: 5
                });

                if (!response.headers['content-type']?.startsWith('image/')) {
                    throw new Error(`Invalid content type: ${response.headers['content-type'] || 'unknown'}`);
                }

                const buffer = Buffer.from(response.data);
                const processedBuffer = await this.preprocessImage(buffer);

                this.downloadStats.successful++;
                console.log(`✅ Image downloaded successfully (${(buffer.length / 1024).toFixed(2)} KB)`);
                return processedBuffer;

            } catch (error) {
                console.error(`❌ Download attempt ${attempt + 1} failed: ${error.message}`);
                if (attempt === retries) {
                    this.downloadStats.failed++;
                    throw error;
                }
                // Exponential backoff
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            }
        }
    }

    // Enhanced image preprocessing
    async preprocessImage(buffer) {
        try {
            if (!buffer || buffer.length < 256) {
                throw new Error('Invalid image buffer (too small or empty)');
            }

            // Get image metadata first
            const metadata = await sharp(buffer).metadata();
            console.log(`📊 Image info: ${metadata.width}x${metadata.height}, ${metadata.format}, ${metadata.channels} channels`);

            // Enhanced preprocessing pipeline
            let processedImage = sharp(buffer);

            // Handle orientation if EXIF data exists
            if (metadata.orientation) {
                processedImage = processedImage.rotate();
            }

            // Resize and normalize
            processedImage = processedImage
                .resize(512, 512, {
                    fit: 'cover',
                    position: 'center',
                    withoutEnlargement: false
                })
                .normalize({ lower: 1, upper: 99 }) // Improve contrast
                .sharpen() // Enhance edges
                .jpeg({
                    quality: 85,
                    progressive: true
                });

            const result = await processedImage.toBuffer();
            console.log(`🔧 Image preprocessed: ${(result.length / 1024).toFixed(2)} KB`);
            return result;

        } catch (error) {
            console.error('❌ Image preprocessing failed:', error.message);
            throw error;
        }
    }

    // Enhanced perceptual hash generation
    async getEnhancedHash(buffer) {
        try {
            // Generate multiple hash sizes for better accuracy
            const hash8x8 = await this.generateSimpleHash(buffer, 8);
            const hash16x16 = await this.generateSimpleHash(buffer, 16);
            const dctHash = await this.getDCTHash(buffer);

            return {
                simpleHash: hash8x8,
                enhancedHash: hash16x16,
                dctHash
            };
        } catch (error) {
            console.error('❌ Enhanced hash error:', error);
            return {
                simpleHash: '0'.repeat(64),
                enhancedHash: '0'.repeat(256),
                dctHash: '0'.repeat(64)
            };
        }
    }

    async generateSimpleHash(buffer, size) {
        const { data } = await sharp(buffer)
            .resize(size, size, { fit: 'fill' })
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const average = data.reduce((sum, val) => sum + val, 0) / data.length;

        let hash = '';
        for (let i = 0; i < data.length; i++) {
            hash += data[i] > average ? '1' : '0';
        }

        return hash;
    }

    // Discrete Cosine Transform hash for better perceptual matching
    async getDCTHash(buffer) {
        try {
            const { data } = await sharp(buffer)
                .resize(32, 32, { fit: 'fill' })
                .greyscale()
                .raw()
                .toBuffer({ resolveWithObject: true });

            // Simple DCT approximation using 4x4 blocks
            const blockSize = 4;
            const blocks = [];

            for (let y = 0; y < 32; y += blockSize) {
                for (let x = 0; x < 32; x += blockSize) {
                    let blockSum = 0;
                    let blockCount = 0;

                    for (let by = 0; by < blockSize && y + by < 32; by++) {
                        for (let bx = 0; bx < blockSize && x + bx < 32; bx++) {
                            blockSum += data[(y + by) * 32 + (x + bx)];
                            blockCount++;
                        }
                    }

                    blocks.push(blockCount > 0 ? blockSum / blockCount : 0);
                }
            }

            const average = blocks.reduce((sum, val) => sum + val, 0) / blocks.length;
            return blocks.map(block => block > average ? '1' : '0').join('');
        } catch (error) {
            console.error('❌ DCT hash error:', error);
            return '0'.repeat(64);
        }
    }

    // Enhanced color histogram with more granularity
    async getColorHistogram(buffer) {
        const { data, info } = await sharp(buffer)
            .resize(64, 64)
            .raw()
            .toBuffer({ resolveWithObject: true });

        const bins = 32; // More bins for better granularity
        const rHist = new Array(bins).fill(0);
        const gHist = new Array(bins).fill(0);
        const bHist = new Array(bins).fill(0);

        const totalPixels = info.width * info.height;
        const binSize = 256 / bins;

        for (let i = 0; i < data.length; i += 3) {
            const r = Math.min(bins - 1, Math.floor(data[i] / binSize));
            const g = Math.min(bins - 1, Math.floor(data[i + 1] / binSize));
            const b = Math.min(bins - 1, Math.floor(data[i + 2] / binSize));

            rHist[r]++;
            gHist[g]++;
            bHist[b]++;
        }

        // Normalize histograms
        const normalize = (hist) => hist.map(val => val / totalPixels);

        return {
            red: normalize(rHist),
            green: normalize(gHist),
            blue: normalize(bHist),
            combined: normalize(rHist.map((r, i) => r + gHist[i] + bHist[i]))
        };
    }

    // Keep existing edge density method
    async getEdgeDensity(buffer) {
        const { data, info } = await sharp(buffer)
            .resize(100, 100)
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        let edgeCount = 0;
        const threshold = 30;
        const width = info.width;
        const height = info.height;

        // Sobel edge detection
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const sobelX =
                    -1 * data[(y - 1) * width + (x - 1)] +
                    1 * data[(y - 1) * width + (x + 1)] +
                    -2 * data[y * width + (x - 1)] +
                    2 * data[y * width + (x + 1)] +
                    -1 * data[(y + 1) * width + (x - 1)] +
                    1 * data[(y + 1) * width + (x + 1)];

                const sobelY =
                    -1 * data[(y - 1) * width + (x - 1)] +
                    -2 * data[(y - 1) * width + x] +
                    -1 * data[(y - 1) * width + (x + 1)] +
                    1 * data[(y + 1) * width + (x - 1)] +
                    2 * data[(y + 1) * width + x] +
                    1 * data[(y + 1) * width + (x + 1)];

                const magnitude = Math.sqrt(sobelX * sobelX + sobelY * sobelY);

                if (magnitude > threshold) {
                    edgeCount++;
                }
            }
        }

        return {
            density: edgeCount / (width * height),
            totalEdges: edgeCount
        };
    }

    // Keep existing brightness profile method
    async getBrightnessProfile(buffer) {
        const { data, info } = await sharp(buffer)
            .resize(50, 50)
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;
        const quadrants = [0, 0, 0, 0];
        const counts = [0, 0, 0, 0];

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const idx = y * width + x;
                const brightness = data[idx];
                const quadrant = (y < height / 2 ? 0 : 2) + (x < width / 2 ? 0 : 1);
                quadrants[quadrant] += brightness;
                counts[quadrant]++;
            }
        }

        return quadrants.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
    }

    // Keep existing texture metrics method
    async getTextureMetrics(buffer) {
        const { data, info } = await sharp(buffer)
            .resize(64, 64)
            .greyscale()
            .raw()
            .toBuffer({ resolveWithObject: true });

        const width = info.width;
        const height = info.height;
        let variance = 0;
        const mean = data.reduce((sum, val) => sum + val, 0) / data.length;

        for (let i = 0; i < data.length; i++) {
            variance += Math.pow(data[i] - mean, 2);
        }
        variance /= data.length;

        let contrast = 0;
        let contrastCount = 0;

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                const center = data[y * width + x];
                const neighbors = [
                    data[(y - 1) * width + x],
                    data[(y + 1) * width + x],
                    data[y * width + (x - 1)],
                    data[y * width + (x + 1)]
                ];

                const neighborMean = neighbors.reduce((sum, val) => sum + val, 0) / neighbors.length;
                contrast += Math.abs(center - neighborMean);
                contrastCount++;
            }
        }

        return {
            variance,
            contrast: contrastCount > 0 ? contrast / contrastCount : 0,
            mean
        };
    }

    // Enhanced signature generation with caching
    async getEnhancedImageSignature(buffer) {
        const cacheKey = crypto.createHash('md5').update(buffer).digest('hex');

        if (this.cache.has(cacheKey)) {
            console.log('📋 Using cached signature');
            return this.cache.get(cacheKey);
        }

        try {
            console.log('🔍 Generating new image signature...');
            const signature = {
                enhancedHash: await this.getEnhancedHash(buffer),
                colorHistogram: await this.getColorHistogram(buffer),
                edgeDensity: await this.getEdgeDensity(buffer),
                brightnessProfile: await this.getBrightnessProfile(buffer),
                textureMetrics: await this.getTextureMetrics(buffer)
            };

            this.cache.set(cacheKey, signature);
            console.log('✅ Signature generated and cached');
            return signature;
        } catch (error) {
            console.error('❌ Enhanced signature generation error:', error.message);
            return null;
        }
    }

    // Enhanced similarity calculation with multiple hash types
    calculateEnhancedSimilarity(sigA, sigB) {
        if (!sigA || !sigB) return 0;

        const weights = {
            simpleHash: 0.20,
            enhancedHash: 0.20,
            dctHash: 0.15,
            color: 0.20,
            edges: 0.10,
            brightness: 0.10,
            texture: 0.05
        };

        let similarities = {};

        // Hash similarities
        if (sigA.enhancedHash && sigB.enhancedHash) {
            similarities.simpleHash = this.hammingDistance(
                sigA.enhancedHash.simpleHash,
                sigB.enhancedHash.simpleHash
            );
            similarities.enhancedHash = this.hammingDistance(
                sigA.enhancedHash.enhancedHash,
                sigB.enhancedHash.enhancedHash
            );
            similarities.dctHash = this.hammingDistance(
                sigA.enhancedHash.dctHash,
                sigB.enhancedHash.dctHash
            );
        } else {
            similarities.simpleHash = 0;
            similarities.enhancedHash = 0;
            similarities.dctHash = 0;
        }

        // Color histogram similarity
        similarities.color = 0;
        if (sigA.colorHistogram && sigB.colorHistogram) {
            const colorSims = [
                this.cosineSimilarity(sigA.colorHistogram.red, sigB.colorHistogram.red),
                this.cosineSimilarity(sigA.colorHistogram.green, sigB.colorHistogram.green),
                this.cosineSimilarity(sigA.colorHistogram.blue, sigB.colorHistogram.blue),
                this.cosineSimilarity(sigA.colorHistogram.combined, sigB.colorHistogram.combined)
            ];
            similarities.color = colorSims.reduce((sum, sim) => sum + sim, 0) / colorSims.length;
        }

        // Edge density similarity
        similarities.edges = 0;
        if (sigA.edgeDensity && sigB.edgeDensity) {
            similarities.edges = 1 - Math.min(1, Math.abs(sigA.edgeDensity.density - sigB.edgeDensity.density));
        }

        // Brightness profile similarity
        similarities.brightness = this.cosineSimilarity(sigA.brightnessProfile, sigB.brightnessProfile);

        // Texture similarity
        similarities.texture = 0;
        if (sigA.textureMetrics && sigB.textureMetrics) {
            const varSim = 1 - Math.min(1, Math.abs(sigA.textureMetrics.variance - sigB.textureMetrics.variance) / 15000);
            const contrastSim = 1 - Math.min(1, Math.abs(sigA.textureMetrics.contrast - sigB.textureMetrics.contrast) / 255);
            similarities.texture = (Math.max(0, varSim) + Math.max(0, contrastSim)) / 2;
        }

        // Calculate weighted final similarity
        const finalSimilarity = Object.keys(weights).reduce((total, key) => {
            return total + (weights[key] * (similarities[key] || 0));
        }, 0);

        return Math.max(0, Math.min(1, finalSimilarity));
    }

    // Hamming distance for hash comparison
    hammingDistance(hash1, hash2) {
        if (!hash1 || !hash2 || hash1.length !== hash2.length) return 0;

        let matches = 0;
        for (let i = 0; i < hash1.length; i++) {
            if (hash1[i] === hash2[i]) matches++;
        }

        return matches / hash1.length;
    }

    // Enhanced cosine similarity
    cosineSimilarity(a, b) {
        if (!a || !b || a.length !== b.length || a.length === 0) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        if (normA === 0 || normB === 0) return 0;
        return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    // Enhanced person processing with better error handling
    async processPerson(person) {
        const signatures = [];
        let successCount = 0;
        let errorCount = 0;

        console.log(`👤 Processing ${person.name} with ${person.imageUrls.length} images...`);

        for (let i = 0; i < person.imageUrls.length; i++) {
            const url = person.imageUrls[i];

            try {
                console.log(`  📸 Processing image ${i + 1}/${person.imageUrls.length}...`);

                const buffer = await this.downloadImage(url);
                if (!buffer) {
                    errorCount++;
                    continue;
                }

                const signature = await this.getEnhancedImageSignature(buffer);
                if (signature) {
                    signatures.push({
                        ...signature,
                        imageIndex: i,
                        url: url.substring(0, 100) + '...' // Store partial URL for reference
                    });
                    successCount++;
                    console.log(`    ✅ Image ${i + 1} processed successfully`);
                } else {
                    errorCount++;
                    console.log(`    ❌ Image ${i + 1} failed to generate signature`);
                }
            } catch (error) {
                console.error(`    ❌ Image ${i + 1} error: ${error.message}`);
                errorCount++;
            }
        }

        if (successCount === 0 && errorCount > 0) {
            console.warn(`⚠️  All images failed for ${person.name}`);
        }

        const avgSignature = signatures.length > 0
            ? this.calculateAverageSignature(signatures)
            : null;

        console.log(`✅ ${person.name}: ${successCount} successful, ${errorCount} failed`);

        return {
            ...person,
            signatures,
            avgSignature,
            processingStats: {
                totalImages: person.imageUrls.length,
                successfulImages: successCount,
                failedImages: errorCount,
                successRate: person.imageUrls.length > 0 ? (successCount / person.imageUrls.length * 100).toFixed(1) + '%' : '0%'
            }
        };
    }

    // Enhanced average signature calculation
    calculateAverageSignature(signatures) {
        if (!signatures || signatures.length === 0) return null;

        console.log(`🔄 Calculating average signature from ${signatures.length} images...`);

        return {
            enhancedHash: {
                simpleHash: signatures[0].enhancedHash.simpleHash, // Use most representative hash
                enhancedHash: signatures[0].enhancedHash.enhancedHash,
                dctHash: signatures[0].enhancedHash.dctHash
            },
            colorHistogram: this.averageColorHistogram(signatures.map(s => s.colorHistogram)),
            edgeDensity: this.averageEdgeDensity(signatures.map(s => s.edgeDensity)),
            brightnessProfile: this.averageArrays(signatures.map(s => s.brightnessProfile)),
            textureMetrics: this.averageTextureMetrics(signatures.map(s => s.textureMetrics))
        };
    }

    averageColorHistogram(histograms) {
        if (!histograms || histograms.length === 0) return null;

        return {
            red: this.averageArrays(histograms.map(h => h.red)),
            green: this.averageArrays(histograms.map(h => h.green)),
            blue: this.averageArrays(histograms.map(h => h.blue)),
            combined: this.averageArrays(histograms.map(h => h.combined))
        };
    }

    averageEdgeDensity(edgeDensities) {
        if (!edgeDensities || edgeDensities.length === 0) return null;

        return {
            density: edgeDensities.reduce((sum, e) => sum + e.density, 0) / edgeDensities.length,
            totalEdges: edgeDensities.reduce((sum, e) => sum + e.totalEdges, 0) / edgeDensities.length
        };
    }

    averageTextureMetrics(textureMetrics) {
        if (!textureMetrics || textureMetrics.length === 0) return null;

        return {
            variance: textureMetrics.reduce((sum, t) => sum + t.variance, 0) / textureMetrics.length,
            contrast: textureMetrics.reduce((sum, t) => sum + t.contrast, 0) / textureMetrics.length,
            mean: textureMetrics.reduce((sum, t) => sum + t.mean, 0) / textureMetrics.length
        };
    }

    averageArrays(arrays) {
        if (!arrays || arrays.length === 0) return [];

        const length = arrays[0].length;
        const sum = new Array(length).fill(0);

        for (const arr of arrays) {
            for (let i = 0; i < length; i++) {
                sum[i] += (arr[i] || 0);
            }
        }

        return sum.map(val => val / arrays.length);
    }

    // Enhanced matching with multiple confidence levels
    async findBestMatches(uploadedSignature, topN = 3) {
        if (!uploadedSignature) {
            return {
                matches: [],
                bestMatch: null,
                confidenceLevel: 'no-match',
            };
        }

        console.log(`🎯 Searching for matches in database...`);

        const allImages = await ProfileImage.findAll();
        const matches = [];

        for (const image of allImages) {
            if (!image.signature) continue;

            const similarity = this.calculateEnhancedSimilarity(
                uploadedSignature,
                image.signature
            );

            if (similarity >= 0.70) {
                const profile = await image.getProfile();
                matches.push({
                    profile,
                    image,
                    similarity,
                    confidenceLevel: this.getConfidenceLevel(similarity)
                });
            }
        }

        // Sort by similarity (highest first)
        matches.sort((a, b) => b.similarity - a.similarity);

        const bestMatch = matches.length > 0 ? matches[0] : null;
        const confidenceLevel = bestMatch ? bestMatch.confidenceLevel : 'no-match';

        console.log(`🔍 Found ${matches.length} potential matches`);
        if (bestMatch) {
            console.log(`🏆 Best match: ${bestMatch.profile.name} (${(bestMatch.similarity * 100).toFixed(1)}% - ${bestMatch.confidenceLevel})`);
        }

        return {
            matches: matches.slice(0, topN),
            bestMatch,
            confidenceLevel,
        };
    }

    getConfidenceLevel(similarity) {
        if (similarity >= 0.95) return 'very-high';
        if (similarity >= 0.90) return 'high';
        if (similarity >= 0.85) return 'medium';
        return 'low';
    }
}

module.exports = EnhancedImageRecognizer;