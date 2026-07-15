$filePath = "screens\HomeScreen.jsx"
$content = Get-Content $filePath -Raw

# 1. Add getLifeExample function after getReflection function
$getLifeExampleFunction = @'

  // Generate life example for the proverb
 const getLifeExample= useCallback((proverb) => {
    if (!proverb) return "";

  const examples = {
      sw: {
        "Kuna Mungu Eeeh, anaabudiwa.": "Mfano: Biashara yako inakwama, unaweza kuswali na kuomba mwongozo wa Mungu badala ya kukata tamaa. Au unapopata mafanikio makubwa, kumshukuru Mungu kunakukumbusha kuwa sio kwa nguvu zako pekee.",
        "Wanetu eeh tuwe na subira.": "Mfano: Unajenga nyumba, huwezi kukaa madirisha na milango kabla ya msingi kuwa imara. Vilevile, elimu au biashara inahitaji muda - miaka 4 ya chuo kikuu au miezi 6 ya mpango wa biashara kabla ya faida.",
        "Wanetu eeh tuwe na tuwe na Ukiasi.": "Mfano: Unapopata mishahara mingi, usijaribu kuishi kama tajiri. Fanya bajeti, akiba, na uishi kadiri ya kipato chako. Au usijilinganishe na wengine kwenye mitandao - kila mtu ana safari yake.",
        "Haba na haba hujaza kibaba.": "Mfano: Akiba ya shillingi 1000 kwa siku ni shillingi 365,000 kwa mwaka. Kusoma kurasa 5 kwa siku kunakamilisha vitabu vingi mwakani. Mabadiliko madogo ya kila siku yanaleta tofauti kubwa.",
        "Haraka haraka haina baraka.": "Mfano: Mwanafunzi anasoma usiku wa manane kabla ya mtihani - anapita maswali muhimu. Mjenzi anajenga haraka - ukuta unapasuka. Lakini mpanda mbao anavuna baada ya msimu mzima wa uvumilivu.",
        "Bandu bandu humaliza gogo.": "Mfano: Kuandika riwaya - andika ukurasa 1 kwa siku, baada ya mwaka una kitabu! Kulipa deni - lipa kidogo kila mwezi, hatimaye umemaliza. Safari ndefu huanza na hatua moja."
      },
      en: {
        "There is God, He is worshiped.": "Example: When your business struggles, you can pray for guidance instead of giving up. Or when you achieve success, thanking God reminds you it's not by your strength alone.",
        "Let us be patient.": "Example: Building a house - you can't install windows before the foundation is solid. Similarly, education or business takes time - 4 years of university or months of business planning before profit.",
        "Let us be content and moderate.": "Example: When you earn a good salary, don't try to live like a millionaire. Budget, save, and live within your means. Or don't compare yourself to others on social media - everyone has their own journey.",
        "Little by little fills the measure.": "Example: Saving 1000 shillings daily is 365,000 shillings yearly. Reading 5 pages daily completes many books in a year. Small daily changes create big differences.",
        "Haste has no blessing.": "Example: A student crams all night before an exam - they miss key questions. A builder builds quickly - the wall cracks. But the farmer harvests after a full season of patience.",
        "Little by little finishes the log.": "Example: Writing a novel - write 1 page daily, after a year you have a book! Paying debt - pay a little each month, eventually it's gone. A long journey begins with one step."
      }
    };

   const key = isEnglish ? proverb.enText : proverb.text;
   const exampleSet = isEnglish ? examples.en : examples.sw;

   const example= exampleSet[key];
     
    if (example) {
    return example;
    }
    
  return isEnglish
      ? "Example: Consider how small consistent actions in your daily routine can lead to significant positive changes over time. Think about a specific situation in your life where this wisdom could apply."
      : "Mfano: Fikiria jinsi vitendo vidogo vya kila siku vinavyoweza kuleta mabadiliko makubwa chanya kadiri muda unavyokwenda. Waza kuhusu hali maalum katika maisha yako ambayo dibaji hii inaweza kutumika.";
  }, [isEnglish]);
'@

# Insert getLifeExample after getReflection function (after line ending with }, [isEnglish]);)
$content = $content-replace '(}, \[isEnglish\]\);)(\s+const handleToggleExpand)', "`$1$getLifeExampleFunction`$2"

# 2. Update UI to show life example section
$lifeExampleUI = @'

              {/* Life Example Section */}
             <View style={styles.lifeExampleContainer}>
               <View style={styles.lifeExampleHeader}>
                 <Ionicons name="people-outline" size={20} color="#285D6C" />
                 <Text style={styles.lifeExampleTitle}>
                   {isEnglish ? "Life Example" : "Mfano wa Maisha"}
                 </Text>
               </View>
               <Text style={styles.lifeExampleText}>
                 {getLifeExample(proverb)}
               </Text>
             </View>
'@

# Insert life example UI after reflection container, before source container
$content = $content -replace '(\s+</Animated\.View>\s+)(\s+<View style=\{styles\.sourceContainer\})', "`$1$lifeExampleUI`$2"

# 3. Add styles for life example section
$lifeExampleStyles = @'

  lifeExampleContainer: {
   backgroundColor: '#E8F4F8',
   borderRadius: 16,
   padding: 18,
   borderLeftWidth: 3,
   borderLeftColor: '#8ED081',
   marginTop: 16,
  },
  lifeExampleHeader: {
   flexDirection: 'row',
   alignItems: 'center',
   marginBottom: 12,
  },
  lifeExampleTitle: {
   fontSize: 16,
   fontWeight: '700',
  color: '#1F2937',
   marginLeft: 8,
  },
  lifeExampleText: {
   fontSize: 15,
   lineHeight: 24,
  color: '#4B5563',
   fontWeight: '400',
   textAlign: 'left',
  },
'@

# Insert life example styles before fabContainer style
$content = $content -replace '(\s+f abContainer:)', "$lifeExampleStyles`$1"

# Write the updated content back
$content | Set-Content $filePath -NoNewline

Write-Host "Successfully updated HomeScreen.jsx with life example section!"
